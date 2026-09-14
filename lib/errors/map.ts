import { ApiError } from "@/lib/api/client";

const ERROR_MESSAGES_RU: Record<string, string> = {
  VALIDATION_ERROR: "Проверьте правильность заполнения формы.",
  UNAUTHENTICATED: "Сессия больше недействительна. Войдите снова.",
  FORBIDDEN: "У вас нет прав для этого действия.",
  NOT_FOUND: "Запись не найдена.",
  INSUFFICIENT_STOCK: "Недостаточно материала на складе.",
  INSUFFICIENT_CASH: "Недостаточно средств в кассе.",
  IDEMPOTENCY_KEY_REUSED: "Этот запрос уже был использован с другими данными.",
  CANCELLATION_HAS_DEPENDENCIES:
    "Операцию нельзя отменить: от неё зависят другие записи.",
  PURCHASE_HAS_DEPENDENT_MOVEMENTS:
    "Закупку нельзя отменить: материалы уже использованы или перемещены.",
  CROSS_PROJECT_TRANSFER_FORBIDDEN:
    "Перемещение между разными проектами запрещено.",
  CONCURRENT_MODIFICATION:
    "Запись была изменена другим пользователем. Обновите страницу и попробуйте снова.",
  DATABASE_ERROR: "Произошла ошибка на сервере. Попробуйте ещё раз.",
  USER_DISABLED: "Ваша сессия больше недействительна. Войдите снова.",
  SETTLEMENT_RATE_REQUIRED: "Укажите курс для этой операции.",
};

const GENERIC_MESSAGE = "Что-то пошло не так. Попробуйте ещё раз.";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES_RU[error.code] ?? GENERIC_MESSAGE;
  }
  return GENERIC_MESSAGE;
}

export function getErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}
