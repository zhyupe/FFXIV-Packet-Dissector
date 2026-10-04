# UI components

These components were added from the official shadcn/ui `new-york` registry with
shadcn CLI 4.21.1 and use Radix primitives. See [the shadcn/ui documentation](https://ui.shadcn.com/docs)
and the adjacent MIT license.

The application owns these source files. Local adaptations use `@/lib/utils` for
class merging and a narrower, higher-contrast ScrollArea thumb. Theme tokens live
in `src/theme.css`; application layout lives in `src/style.css`.

Run `pnpm exec shadcn add <component>` from `packages/desktop` to add components.
Review generated imports against the aliases in `components.json`.
