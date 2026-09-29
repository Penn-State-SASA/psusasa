import { useEffect, useState } from "react";
import { set, unset, useClient, type ArrayOfPrimitivesInputProps } from "sanity";
import { Card, Checkbox, Flex, Stack, Text } from "@sanity/ui";
import type { FormerBoardMember } from "../../src/lib/types";
import { toggleExcludedKey } from "../../src/lib/formerBoard";
import { formerBoardRosterQuery } from "../lib/queries";

// Renders the Former Board Members roster as one checkbox per person (ticked
// = free for this event). The field itself only stores who's unticked, so
// every roster member — including anyone added later — starts out free.
export default function FormerBoardFreeEntryInput(props: ArrayOfPrimitivesInputProps) {
  const { onChange, readOnly } = props;
  const excluded = (props.value ?? []).filter((v): v is string => typeof v === "string");
  const client = useClient({ apiVersion: "2024-01-01" });
  const [roster, setRoster] = useState<FormerBoardMember[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .fetch<{ members?: FormerBoardMember[] | null } | null>(
        formerBoardRosterQuery,
        {},
        { perspective: "published" }
      )
      .then((doc) => {
        if (!cancelled) setRoster(doc?.members ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  function toggle(rosterKey: string, free: boolean) {
    const next = toggleExcludedKey(excluded, rosterKey, free);
    onChange(next.length > 0 ? set(next) : unset());
  }

  if (loadError) {
    return (
      <Card padding={3} radius={2} tone="critical">
        <Text size={1}>Couldn&apos;t load the Former Board Members list.</Text>
      </Card>
    );
  }
  if (roster === null) {
    return <Text size={1} muted>Loading former board members…</Text>;
  }
  if (roster.length === 0) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          No former board members yet — add and publish them under Former Board Members.
        </Text>
      </Card>
    );
  }

  const freeCount = roster.filter((m) => !excluded.includes(m._key)).length;

  return (
    <Stack space={3}>
      <Text size={1} muted>
        {freeCount} of {roster.length} get in free
      </Text>
      {roster.map((m) => {
        const id = `former-board-${m._key}`;
        return (
          <Flex key={m._key} align="center" gap={2}>
            <Checkbox
              id={id}
              checked={!excluded.includes(m._key)}
              readOnly={readOnly}
              onChange={(e) => toggle(m._key, e.currentTarget.checked)}
            />
            <Text as="label" htmlFor={id} size={1}>
              {m.firstName} {m.lastName}
            </Text>
          </Flex>
        );
      })}
    </Stack>
  );
}
