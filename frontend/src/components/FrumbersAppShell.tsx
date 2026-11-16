import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Button,
  Drawer,
  Group,
  Image,
  Popover,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Suspense, type ReactNode } from "react";
import { useMe } from "../hooks/useMe";
import { useDisclosure } from "@mantine/hooks";
import { ErrorBoundary } from "react-error-boundary";
import { MainContentError } from "./MainContentError";
import { ProfileDrawerContent } from "./ProfileDrawerContent";
import { MainContentLoading } from "./MainContentLoading";
import { Link } from "@tanstack/react-router";
import { Motd } from "./Motd";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { TuesdaySticker } from "./TuesdaySticker";
import { IconBrandGithub, IconPencil } from "@tabler/icons-react";
import { useRenameHint } from "../utils/hints";
import packageJson from "../../package.json" with { type: "json" };
import classes from "./FrumbersAppShell.module.css";

export function FrumbersAppShell({ children }: { children: ReactNode }) {
  const { name } = useMe();
  const [isDrawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const renameHint = useRenameHint();

  return (
    <>
      <AppShell padding={0} header={{ height: 64 }}>
        <AppShell.Header className={classes.header}>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Link to="/" className={classes.brand}>
                <Image src="/icon.png" alt="" w={34} h={34} />
                <Title order={3} className={classes.title}>
                  Frumbers
                </Title>
              </Link>
              <TuesdaySticker />
            </Group>

            <Group gap={4} wrap="nowrap">
              <Tooltip label="View source on GitHub">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  component="a"
                  href={packageJson.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View source on GitHub"
                  visibleFrom="sm"
                >
                  <IconBrandGithub size={20} />
                </ActionIcon>
              </Tooltip>
              <ColorSchemeToggle />
              <Popover
                opened={renameHint.show && !isDrawerOpened}
                position="bottom-end"
                withArrow
                arrowOffset={24}
                width={230}
                offset={10}
                zIndex={300}
              >
                <Popover.Target>
                  <Button
                    variant="default"
                    size="sm"
                    ml="xs"
                    px="xs"
                    maw={190}
                    aria-label="Change your name"
                    leftSection={
                      <Avatar name={name} color="initials" size={24} />
                    }
                    rightSection={<IconPencil size={14} />}
                    onClick={() => {
                      renameHint.dismiss();
                      openDrawer();
                    }}
                  >
                    <Text span size="sm" fw={600} truncate visibleFrom="xs">
                      {name}
                    </Text>
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={2}>
                    Not feeling that name?
                  </Text>
                  <Text size="sm" c="dimmed">
                    You can change your name here.
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    mt="xs"
                    ml="auto"
                    display="block"
                    onClick={renameHint.dismiss}
                  >
                    Got it
                  </Button>
                </Popover.Dropdown>
              </Popover>
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Main className={classes.main}>
          <Box className={classes.content}>{children}</Box>
          <Box component="footer" className={classes.footer}>
            <Suspense fallback={null}>
              <Motd />
            </Suspense>
          </Box>
        </AppShell.Main>
      </AppShell>
      <Drawer
        position="right"
        opened={isDrawerOpened}
        onClose={closeDrawer}
        title={
          <Title order={3} component="span">
            Your profile
          </Title>
        }
      >
        <ErrorBoundary
          fallbackRender={(props) => <MainContentError {...props} />}
        >
          <Suspense fallback={<MainContentLoading />}>
            <ProfileDrawerContent />
          </Suspense>
        </ErrorBoundary>
      </Drawer>
    </>
  );
}
