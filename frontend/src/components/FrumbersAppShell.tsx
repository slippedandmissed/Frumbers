import {
  ActionIcon,
  AppShell,
  Avatar,
  Container,
  Drawer,
  Group,
  Image,
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
import { IconBrandGithub } from "@tabler/icons-react";
import packageJson from "../../package.json" with { type: "json" };

export function FrumbersAppShell({ children }: { children: ReactNode }) {
  const { name } = useMe();
  const [isDrawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  return (
    <>
      <AppShell padding="md" header={{ height: 60 }}>
        <AppShell.Header>
          <Group h="100%" px="md">
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Group>
                <Image src="/icon.png" alt="Frumbers Logo" maw={40} mah={40} />
                <Title size="xl">Frumbers</Title>
              </Group>
            </Link>
            <Tooltip ml="xl" label="View source on GitHub">
              <ActionIcon
                variant="subtle"
                component="a"
                href={packageJson.repository}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
              >
                <IconBrandGithub />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Profile">
              <Avatar
                style={{ cursor: "pointer" }}
                ml="auto"
                name={name}
                color="initials"
                onClick={openDrawer}
              />
            </Tooltip>
          </Group>
        </AppShell.Header>
        <AppShell.Main pb="xl">
          {children}
          <Container style={{ position: "fixed", bottom: 10, right: 10 }}>
            <Motd />
          </Container>
        </AppShell.Main>
      </AppShell>
      <Drawer position="right" opened={isDrawerOpened} onClose={closeDrawer}>
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
