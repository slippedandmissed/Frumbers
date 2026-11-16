import { ActionIcon, Menu, useMantineColorScheme } from "@mantine/core";
import { IconCheck, IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";

const OPTIONS = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "auto", label: "System", icon: IconSunMoon },
] as const;

/** Light / dark / system. Mantine persists the choice in localStorage. */
export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const current = OPTIONS.find((o) => o.value === colorScheme) ?? OPTIONS[2];

  return (
    <Menu position="bottom-end" width={160} shadow="md">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Colour theme"
        >
          <current.icon size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <Menu.Item
            key={value}
            leftSection={<Icon size={16} />}
            rightSection={
              colorScheme === value ? <IconCheck size={14} /> : null
            }
            onClick={() => setColorScheme(value)}
          >
            {label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
