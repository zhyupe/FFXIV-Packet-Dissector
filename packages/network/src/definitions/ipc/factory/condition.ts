import type { IPCFieldCondition } from '@/generate/interface'
import { condition } from '@/struct/struct.decorator'

export type ConditionItem<Fields extends string> = Partial<
  Record<Fields, Omit<IPCFieldCondition, 'value'>>
>
export type Conditions<
  Fields extends string,
  Value extends string | number,
> = Partial<Record<Value, ConditionItem<Fields>>>

export function createConditionFactory<
  Fields extends string,
  Value extends string | number,
>(
  matchField: Fields,
  conditions: Conditions<Fields, Value>,
  isNumericKey = true,
) {
  return (name: Fields) => {
    const picked = Object.entries(conditions)
      .map(([value, condition]): IPCFieldCondition | null => {
        if ((condition as ConditionItem<Fields>)?.[name]) {
          return {
            value: isNumericKey ? +value : value,
            ...(condition as ConditionItem<Fields>)[name],
          }
        }

        return null
      })
      .filter((a): a is IPCFieldCondition => !!a)

    if (picked.length) {
      return condition({ [matchField]: picked })
    }

    return () => {}
  }
}
