/**
 * Desktop SettingsContent layout primitives (SectionHeader + SettingRow +
 * subsection labels) for the VS Code settings hub — presentation only.
 */

import type { ReactNode } from "react";

export function SettingsSectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="altai-settings-section">
      <header className="altai-settings-section-header">
        <h2 className="altai-settings-section-title">{title}</h2>
        {description ? (
          <p className="altai-settings-section-desc">{description}</p>
        ) : null}
      </header>
      <div className="altai-settings-section-body">{children}</div>
    </div>
  );
}

export function SettingsSubsection({ label }: { label: string }) {
  return <h3 className="altai-settings-subsection">{label}</h3>;
}

export function SettingsSettingRow({
  title,
  description,
  children,
  stacked = false,
  className,
}: {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  /** Put controls under the copy (host path, text fields). */
  stacked?: boolean;
  className?: string;
}) {
  const classes = [
    "altai-settings-row",
    stacked ? "altai-settings-row--stacked" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <div className="altai-settings-row-copy">
        <span className="altai-settings-row-title">{title}</span>
        {description ? (
          <span className="altai-settings-row-desc">{description}</span>
        ) : null}
      </div>
      {children ? (
        <div className="altai-settings-row-control">{children}</div>
      ) : null}
    </div>
  );
}

export function SettingsEmptyHint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="altai-settings-empty" role="status">
      <strong className="altai-settings-row-title">{title}</strong>
      <p className="altai-settings-row-desc">{description}</p>
    </div>
  );
}
