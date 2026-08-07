/**
 * Switch control for Desktop SettingRow layout.
 */

export function SettingsSwitch({
  checked,
  disabled,
  onChange,
  danger,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label
      className={
        danger && checked
          ? "altai-settings-switch is-danger"
          : "altai-settings-switch"
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="altai-settings-switch-ui" aria-hidden />
    </label>
  );
}
