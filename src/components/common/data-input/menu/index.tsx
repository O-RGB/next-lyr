import React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface IContextMenuItem<T = unknown> {
  type: T;
  text: string;
  icon?: React.ReactNode;
  onClick?: (type: T, text: string) => void;
}

export interface IContextMenuGroup<T = unknown> {
  name?: string;
  contextMenus: IContextMenuItem<T>[];
}

export interface ContextMenuProps<T = unknown> {
  items: IContextMenuGroup<T>[];
  /**
   * The element that opens the menu. A render function is still accepted for
   * compatibility, but base-ui exposes open state through `aria-expanded`, so
   * passing the element directly is preferred.
   */
  menuButton:
    | React.ReactElement
    | ((props: { open: boolean }) => React.ReactElement);
}

/**
 * Grouped action menu, on the shared base-ui menu.
 *
 * Items are sized for touch (the shared `DropdownMenuItem` carries a 40px
 * minimum height), and positioning/portalling/dismissal come from the primitive
 * rather than the inline z-index and bounding-box padding this used to need.
 */
const ContextMenuCommon = <T,>({ items, menuButton }: ContextMenuProps<T>) => {
  const trigger =
    typeof menuButton === "function" ? menuButton({ open: false }) : menuButton;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" className="min-w-48">
        {items.map((group, groupIndex) => (
          <React.Fragment key={`menu-group-${groupIndex}`}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.name ? (
                <DropdownMenuLabel>{group.name}</DropdownMenuLabel>
              ) : null}
              {group.contextMenus.map((item, itemIndex) => (
                <DropdownMenuItem
                  key={`menu-item-${groupIndex}-${itemIndex}`}
                  onClick={() => item.onClick?.(item.type, item.text)}
                >
                  {item.icon}
                  <span>{item.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContextMenuCommon;
