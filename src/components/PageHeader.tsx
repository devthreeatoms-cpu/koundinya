interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight break-words">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto sm:shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none [&>*]:min-w-0">
          {actions}
        </div>
      )}
    </div>
  );
}
