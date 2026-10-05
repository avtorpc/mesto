<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final class AiEvaluationService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private string $aiApiKey,
        private string $aiApiBaseUrl,
        private string $aiModel,
    ) {}

    public function evaluate(array $test, array $answers): array
    {
        if ($this->aiApiKey === '' || $this->aiModel === '') {
            throw new \RuntimeException('AI_API_KEY and AI_MODEL must be configured.');
        }

        $response = $this->httpClient->request('POST', rtrim($this->aiApiBaseUrl, '/').'/chat/completions', [
            'headers' => ['Authorization' => 'Bearer '.$this->aiApiKey],
            'json' => [
                'model' => $this->aiModel,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => 'Evaluate the test. Return JSON with score (0-100), decision, strengths, weaknesses, and questions.'],
                    ['role' => 'user', 'content' => json_encode(['test' => $test, 'answers' => $answers], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)],
                ],
            ],
        ]);

        $content = $response->toArray()['choices'][0]['message']['content'] ?? '';
        $result = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        $result['score'] = max(0, min(100, (int) ($result['score'] ?? 0)));

        return $result;
    }
}
