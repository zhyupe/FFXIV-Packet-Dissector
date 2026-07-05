import {
  dissector,
  type FieldDissectorCondition,
  type FieldDissectorOptions,
} from '@/struct/struct.decorator'

export type ConditionItem<Fields extends string> = Partial<
  Record<Fields, Omit<FieldDissectorCondition, 'value'>>
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
  return (name: Fields, options: FieldDissectorOptions = {}) => {
    const picked = Object.entries(conditions)
      .map(([value, condition]): FieldDissectorCondition | null => {
        if ((condition as ConditionItem<Fields>)?.[name]) {
          return {
            value: isNumericKey ? +value : value,
            ...(condition as ConditionItem<Fields>)[name],
          }
        }

        return null
      })
      .filter((a): a is FieldDissectorCondition => !!a)

    if (picked.length) {
      return dissector({
        condition: { [matchField]: picked },
        ...options,
      })
    }

    return () => {}
  }
}
