<?php

namespace App\Controller;

use App\Service\GigaChatClient;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class QualificationTestController
{
    private const SPECIALIZATIONS = ['backend', 'frontend'];
    private const GRADES = ['trainee', 'junior', 'middle', 'senior'];
    private const STACK_OPTIONS = [
        'languages' => ['JavaScript / TypeScript', 'Python', 'Java', 'PHP', 'C#', 'Go', 'Kotlin', 'C++'],
        'databases' => ['SQL и проектирование схем', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'ClickHouse', 'Индексы и оптимизация запросов', 'Транзакции и уровни изоляции'],
        'devops' => ['Docker', 'Docker Compose', 'Linux', 'Nginx', 'CI/CD', 'Kubernetes', 'Terraform', 'Мониторинг и логирование'],
        'practices' => ['REST API', 'Автоматизированное тестирование', 'Git', 'Безопасность приложений', 'Микросервисная архитектура', 'Очереди сообщений', 'Проектирование систем', 'Профилирование и производительность'],
    ];

    #[Route('/api/qualification-tests/generate', name: 'qualification_test_generate', methods: ['POST'])]
    public function generate(Request $request, GigaChatClient $client, LoggerInterface $logger): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($payload)) {
                throw new \JsonException('Expected a JSON object.');
            }
            $profile = $this->validateProfile($payload);
            $test = $client->generateQualificationTest($profile);

            return new JsonResponse(['test' => $test], JsonResponse::HTTP_CREATED);
        } catch (\InvalidArgumentException $exception) {
            return new JsonResponse(['error' => $exception->getMessage()], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\JsonException) {
            return new JsonResponse(['error' => 'Тело запроса должно быть корректным JSON.'], JsonResponse::HTTP_BAD_REQUEST);
        } catch (\Throwable $exception) {
            $logger->error('Qualification test generation failed: {type}: {message}', [
                'type' => $exception::class,
                'message' => $exception->getMessage(),
            ]);
            return new JsonResponse(
                ['error' => 'Не удалось получить тест от GigaChat. Проверьте настройки API и повторите попытку.'],
                JsonResponse::HTTP_BAD_GATEWAY,
            );
        }
    }

    private function validateProfile(array $payload): array
    {
        $specialization = strtolower(trim((string) ($payload['specialization'] ?? '')));
        $declaredGrade = strtolower(trim((string) ($payload['declaredGrade'] ?? '')));
        $stack = $this->validateStack($payload['stack'] ?? null);
        $competencies = [...$stack['databases'], ...$stack['practices']];
        $technologies = [...$stack['languages'], ...$stack['devops']];

        if (!in_array($specialization, self::SPECIALIZATIONS, true)) {
            throw new \InvalidArgumentException('Выберите доступную специализацию.');
        }
        if (!in_array($declaredGrade, self::GRADES, true)) {
            throw new \InvalidArgumentException('Выберите доступный грейд.');
        }

        return compact('specialization', 'declaredGrade', 'competencies', 'technologies', 'stack');
    }

    private function validateStack(mixed $stack): array
    {
        if (!is_array($stack)) {
            throw new \InvalidArgumentException('Выберите технологии для теста.');
        }

        $result = [];
        foreach (array_keys(self::STACK_OPTIONS) as $group) {
            $values = is_array($stack[$group] ?? null) ? $stack[$group] : [];
            $result[$group] = array_values(array_unique(array_filter(array_map(
                static fn (mixed $value): string => mb_substr(trim((string) $value), 0, 80),
                $values,
            ))));
            if (count($result[$group]) > 8) {
                throw new \InvalidArgumentException('В каждой группе можно выбрать не более 8 пунктов.');
            }
            if (array_diff($result[$group], self::STACK_OPTIONS[$group]) !== []) {
                throw new \InvalidArgumentException('В запросе есть неизвестная технология или практика.');
            }
        }

        if (array_sum(array_map('count', $result)) < 2) {
            throw new \InvalidArgumentException('Выберите хотя бы две технологии или практики.');
        }

        return $result;
    }
}
