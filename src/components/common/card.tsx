import * as React from "react";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={[
      "rounded-xl border bg-card text-card-foreground shadow-sm",
      className,
    ].join(" ")}
    {...props}
  />
));
Card.displayName = "Card";

export default Card
