import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Empty, EmptyDescription, EmptyTitle } from "./empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "./item";

describe("achievement UI primitives", () => {
  it("renders empty and item composition contracts", () => {
    const html = renderToStaticMarkup(
      <>
        <Empty aria-label="No progress">
          <EmptyTitle>Ready to play?</EmptyTitle>
          <EmptyDescription>Your progress will appear here.</EmptyDescription>
        </Empty>
        <ItemGroup>
          <Item role="listitem" variant="outline">
            <ItemContent><ItemTitle>First Steps</ItemTitle></ItemContent>
            <ItemActions>1 / 1</ItemActions>
          </Item>
        </ItemGroup>
      </>,
    );

    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('aria-label="No progress"');
    expect(html).toContain('data-slot="item-group" role="list"');
    expect(html).toContain('role="listitem"');
  });
});
