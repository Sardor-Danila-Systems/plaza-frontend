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
  PROJECT_ACCESS_DENIED: "У вас нет доступа к этому проекту.",
  FILE_TOO_LARGE: "Файл слишком большой.",
  UNSUPPORTED_FILE_TYPE: "Поддерживаются только файлы JPEG, PNG, WebP и PDF.",
  ATTACHMENT_UPLOAD_FAILED: "Не удалось загрузить файл. Попробуйте ещё раз.",
  ATTACHMENT_NOT_READY: "Файл ещё не готов. Попробуйте через момент.",
  UNSUPPORTED_ATTACHMENT_TARGET: "К этой операции нельзя прикрепить файл.",
  ATTACHMENT_LINKED: "Прикреплённый файл нельзя удалить.",
  INTERNAL_ERROR: "Произошла ошибка на сервере. Попробуйте ещё раз.",
  NETWORK_ERROR: "Нет соединения с сервером. Проверьте интернет.",
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
