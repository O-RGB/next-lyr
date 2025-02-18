export interface IOptions {
  value?: string | number | string[] | number[];
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  options?: IOptions[];
}
