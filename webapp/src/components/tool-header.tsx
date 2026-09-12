import { Icon } from "./icons";

type ToolHeaderProps = {
  category: string;
  title: string;
  description: string;
  titleId?: string;
};

export function ToolHeader({ category, title, description, titleId }: ToolHeaderProps) {
  return (
    <header className="tool-header">
      <div>
        <p className="eyebrow">{category}</p>
        <h1 id={titleId}>{title}</h1>
        <p className="tool-description">{description}</p>
      </div>
      <span className="privacy-note"><Icon name="lock" /> 100% browser-based</span>
    </header>
  );
}
