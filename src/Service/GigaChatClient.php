<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\Exception\HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class GigaChatClient
{
    private const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    private const CHAT_URL = 'https://api.giga.chat/v1/chat/completions';
    private const SCOPE = 'GIGACHAT_API_PERS';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $authorizationKey,
        private readonly string $model,
    ) {
    }

    public function generateQualificationTest(array $profile): array
    {
        if (trim($this->authorizationKey) === '' || trim($this->model) === '') {
            throw new \RuntimeException('GigaChat authorization key and model must be configured.');
        }

        $schema = $this->testSchema();
        $prompt = [
            'task' => 'Сформируй короткий профессиональный тест примерно на 5 минут по выбранному пользователем стеку. Не включай ответы и подсказки в формулировки вопросов.',
            'candidate' => $profile,
            'requirements' => [
                'language' => 'ru',
                'questionCount' => 4,
                'formats' => ['single_choice'],
                'difficulty' => 'Соответствует заявленному грейду, без искусственно сложных или двусмысленных вопросов.',
                'coverage' => 'Используй только элементы из candidate.stack. Распредели вопросы по разным выбранным группам, насколько это возможно.',
                'code' => 'Каждый вопрос — single_choice с четырьмя вариантами. Покажи короткий, но содержательный фрагмент кода, SQL, shell-команды, Dockerfile, YAML или конфигурации. Спроси только об анализе этого фрагмента: какой будет результат, где дефект, какая строка исправляет дефект или какое изменение требуется. Запрещено просить написать то, что уже показано, спрашивать название явно видимой команды или помещать готовое решение в codeSnippet. Не используй Markdown-ограждения с обратными кавычками. Не более 12 строк.',
            ],
        ];

        try {
            $accessToken = $this->requestAccessToken();
            $lastValidationError = null;

            for ($attempt = 0; $attempt < 2; ++$attempt) {
                if ($attempt > 0) {
                    $prompt['requirements']['retry'] = 'Предыдущий вариант не прошёл проверку: каждый вопрос обязан содержать реальный фрагмент кода или конфигурации, а не none, none_provided или Markdown-заглушку.';
                }

                $response = $this->httpClient->request('POST', self::CHAT_URL, [
                    'headers' => [
                        'Accept' => 'application/json',
                        'Authorization' => 'Bearer '.$accessToken,
                        'Content-Type' => 'application/json',
                    ],
                    'json' => [
                        'model' => $this->model,
                        'stream' => false,
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'Ты составляешь нейтральные проверочные задания для ИТ-специалистов. Верни только данные по заданной JSON-схеме.',
                            ],
                            [
                                'role' => 'user',
                                'content' => json_encode($prompt, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                            ],
                        ],
                        'response_format' => [
                            'type' => 'json_schema',
                            'schema' => $schema,
                            'strict' => true,
                        ],
                    ],
                    // Structured tests can take longer to generate, especially on GigaChat.
                    'timeout' => 120,
                ]);

                $payload = $response->toArray();
                $content = $payload['choices'][0]['message']['content'] ?? null;
                if (!is_string($content) || trim($content) === '') {
                    $lastValidationError = new \RuntimeException('GigaChat returned an empty test.');
                    continue;
                }

                $test = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                $test = $this->normalizeGeneratedTest($test);
                try {
                    $this->validateGeneratedTest($test);
                } catch (\RuntimeException $exception) {
                    $lastValidationError = $exception;
                    continue;
                }

                $test['id'] = 'test-'.bin2hex(random_bytes(8));
                $test['createdAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
                $test['profile'] = $profile;

                return $test;
            }

            throw $lastValidationError ?? new \RuntimeException('GigaChat returned an invalid test.');
        } catch (HttpExceptionInterface $exception) {
            $details = mb_substr($exception->getResponse()->getContent(false), 0, 500);
            throw new \RuntimeException('GigaChat rejected the request: '.$details, 0, $exception);
        } catch (\JsonException $exception) {
            throw new \RuntimeException('GigaChat returned invalid JSON.', 0, $exception);
        }
    }

    private function requestAccessToken(): string
    {
        try {
            $response = $this->httpClient->request('POST', self::OAUTH_URL, [
                'headers' => [
                    'Accept' => 'application/json',
                    'Authorization' => 'Basic '.trim($this->authorizationKey),
                    'Content-Type' => 'application/x-www-form-urlencoded',
                    'RqUID' => $this->uuidV4(),
                ],
                'body' => ['scope' => self::SCOPE],
                'timeout' => 20,
            ]);

            $payload = $response->toArray();
            $token = $payload['access_token'] ?? null;
            if (!is_string($token) || $token === '') {
                throw new \RuntimeException('GigaChat did not return an access token.');
            }

            return $token;
        } catch (HttpExceptionInterface $exception) {
            $details = mb_substr($exception->getResponse()->getContent(false), 0, 500);
            throw new \RuntimeException('GigaChat authorization failed: '.$details, 0, $exception);
        }
    }

    private function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);

        return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20));
    }

    private function testSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'title' => ['type' => 'string'],
                'description' => ['type' => 'string'],
                'durationMinutes' => ['type' => 'integer'],
                'questions' => [
                    'type' => 'array',
                    'minItems' => 4,
                    'maxItems' => 4,
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'id' => ['type' => 'string'],
                            'type' => ['type' => 'string', 'enum' => ['single_choice']],
                            'competency' => ['type' => 'string'],
                            'technology' => ['type' => 'string'],
                            'prompt' => ['type' => 'string', 'description' => 'Вопрос на анализ показанного фрагмента без подсказки правильного ответа.'],
                            'codeSnippet' => ['type' => 'string', 'minLength' => 1, 'description' => 'Неполный, ошибочный или требующий анализа фрагмент без Markdown-ограждений. Не содержит готового ответа.'],
                            'codeLanguage' => ['type' => 'string', 'minLength' => 1],
                            'options' => [
                                'type' => 'array',
                                'items' => ['type' => 'string'],
                            ],
                            'correctOptionIndex' => ['type' => 'integer', 'minimum' => 0],
                        ],
                        'required' => ['id', 'type', 'competency', 'technology', 'prompt', 'codeSnippet', 'codeLanguage', 'options', 'correctOptionIndex'],
                    ],
                ],
            ],
            'required' => ['title', 'description', 'durationMinutes', 'questions'],
        ];
    }

    private function validateGeneratedTest(mixed $test): void
    {
        if (!is_array($test) || !is_string($test['title'] ?? null) || !is_array($test['questions'] ?? null) || count($test['questions']) !== 4) {
            throw new \RuntimeException('GigaChat returned an unexpected test structure.');
        }

        $questionsWithCode = 0;
        foreach ($test['questions'] as $question) {
            if (!is_array($question) || ($question['type'] ?? null) !== 'single_choice' || !is_string($question['prompt'] ?? null)) {
                throw new \RuntimeException('GigaChat returned an invalid question.');
            }
            if (($question['type'] ?? null) === 'single_choice' && count($question['options'] ?? []) < 2) {
                throw new \RuntimeException('GigaChat returned a choice question without options.');
            }
            if (!is_int($question['correctOptionIndex'] ?? null) || $question['correctOptionIndex'] < 0 || $question['correctOptionIndex'] >= count($question['options'] ?? [])) {
                throw new \RuntimeException('GigaChat returned an invalid correct answer.');
            }
            if (is_string($question['codeSnippet'] ?? null) && trim($question['codeSnippet']) !== '') {
                ++$questionsWithCode;
            }
        }

        if ($questionsWithCode < 1) {
            throw new \RuntimeException('GigaChat returned too few code-based questions.');
        }
    }

    private function normalizeGeneratedTest(mixed $test): mixed
    {
        if (!is_array($test) || !is_array($test['questions'] ?? null)) {
            return $test;
        }

        foreach ($test['questions'] as &$question) {
            if (!is_array($question)) {
                continue;
            }

            $prompt = (string) ($question['prompt'] ?? '');
            if (preg_match('/```([a-zA-Z0-9_+#.-]*)\s*\R?(.*?)```/su', $prompt, $matches) === 1) {
                $question['codeSnippet'] = trim($matches[2]);
                if ($matches[1] !== '') {
                    $question['codeLanguage'] = $matches[1];
                }
                $question['prompt'] = trim(str_replace($matches[0], '', $prompt));
            }

            $code = trim((string) ($question['codeSnippet'] ?? ''));
            $code = preg_replace('/\A```[a-zA-Z0-9_+#.-]*\s*\R?|```\z/u', '', $code) ?? $code;
            if (preg_match('/\Anone(?:[_\s-].*)?\z/i', $code) === 1 || in_array(strtolower(trim($code)), ['n/a', 'not needed', 'не требуется'], true)) {
                $code = '';
            }
            $question['codeSnippet'] = trim($code);
        }
        unset($question);

        return $test;
    }
}
