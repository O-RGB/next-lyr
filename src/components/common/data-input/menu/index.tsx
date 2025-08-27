import React from "react";
import { Menu, MenuItem, MenuDivider, MenuHeader } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/zoom.css";

export interface IContextMenuItem<T = any> {
  type: T;
  text: string;
  icon?: React.ReactNode;
  onClick?: (type: T, text: string) => void;
}

export interface IContextMenuGroup<T = any> {
  name?: string;
  contextMenus: IContextMenuItem<T>[];
}

export interface ContextMenuProps<T = any> {
  items: IContextMenuGroup<T>[];
  menuButton:
    | React.ReactElement
    | ((props: { open: boolean }) => React.ReactElement);
}

const ContextMenuCommon = <T,>({ items, menuButton }: ContextMenuProps<T>) => {
  return (
    <Menu
      menuButton={menuButton}
      transition
      portal
      menuStyle={{
        zIndex: 9999,
      }}
      boundingBoxPadding="10 10 10 10"
    >
      {items.map((group, i) => (
        <React.Fragment key={`menu-group-${i}`}>
          {i > 0 && <MenuDivider />}
          {group.name && (
            <MenuHeader style={{ fontSize: 12 }}>{group.name}</MenuHeader>
          )}
          {group.contextMenus.map((item, j) => (
            <MenuItem
              key={`menu-item-${i}-${j}`}
              onClick={() => item.onClick?.(item.type, item.text)}
              style={{
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {item.icon && <span style={{ fontSize: 16 }}>{item.icon}</span>}
              <span>{item.text}</span>
            </MenuItem>
          ))}
        </React.Fragment>
      ))}
    </Menu>
  );
};

export default ContextMenuCommon;
