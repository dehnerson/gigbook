import type { AnyFieldApi } from '@tanstack/react-form'
import { Field } from '@/components/app/field'
import { Input } from '@/components/ui/input'

export function fieldMessage(field: AnyFieldApi) {
  const error = field.state.meta.errors[0]
  if (typeof error === 'string') return error
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return null
}

export function FormInput({
  field,
  label,
  type = 'text',
  autoComplete,
}: {
  field: AnyFieldApi
  label: string
  type?: string
  autoComplete?: string
}) {
  const message = fieldMessage(field)
  return (
    <Field label={label}>
      <Input
        type={type}
        name={field.name}
        value={typeof field.state.value === 'string' ? field.state.value : ''}
        autoComplete={autoComplete}
        aria-invalid={message ? true : undefined}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {message ? (
        <span className="text-xs text-destructive">{message}</span>
      ) : null}
    </Field>
  )
}
