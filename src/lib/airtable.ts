function escapeForAirtableFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function lookupPastMember(
  firstName: string,
  lastName: string
): Promise<boolean> {
  const tableName =
    process.env.AIRTABLE_PAST_MEMBERS_TABLE_NAME ?? "Past Members";
  const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  if (!first || !last) return false;

  const formula = `AND(LOWER(TRIM({First Name})) = '${escapeForAirtableFormula(first)}', LOWER(TRIM({Last Name})) = '${escapeForAirtableFormula(last)}')`;

  const res = await fetch(
    `${baseUrl}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`,
    {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error(
      `Past Members lookup failed (table="${tableName}", base="${process.env.AIRTABLE_BASE_ID}"): ${res.status} ${await res.text()}`
    );
    // Fail closed — any error treats the user as not-a-past-member, so a
    // missing/misconfigured Past Members table cannot silently let
    // ineligible signups through.
    return false;
  }

  const data = (await res.json()) as { records?: unknown[] };
  const matched = !!(data.records && data.records.length > 0);
  console.log(
    `Past Members lookup "${first} ${last}" in "${tableName}": ${matched ? "MATCH" : "no match"}`
  );
  return matched;
}

export async function appendMemberToAirtable(
  metadata: Record<string, string>,
  paymentIntentId: string
) {
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? "Members";
  const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

  // Skip if a record with this Stripe Payment Intent ID already exists.
  const filter = encodeURIComponent(
    `{Stripe Payment Intent ID} = '${paymentIntentId}'`
  );
  const lookup = await fetch(
    `${baseUrl}?filterByFormula=${filter}&maxRecords=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (lookup.ok) {
    const data = (await lookup.json()) as { records?: unknown[] };
    if (data.records && data.records.length > 0) {
      console.log(
        `Member ${metadata.psuEmail} already in Airtable (${paymentIntentId})`
      );
      return;
    }
  }

  const amountPaidCents = Number(metadata.amountPaidCents);
  const amountPaidDollars = Number.isFinite(amountPaidCents)
    ? amountPaidCents / 100
    : null;

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Timestamp: new Date().toISOString(),
        "First Name": metadata.firstName,
        "Last Name": metadata.lastName,
        "PSU Email": metadata.psuEmail,
        Phone: metadata.phone,
        Year: metadata.year,
        "Membership Type": metadata.membershipTier ?? metadata.membershipType,
        "Amount Paid": amountPaidDollars,
        Major: metadata.major,
        Hometown: metadata.hometown,
        Gender: metadata.gender,
        Religion: metadata.religion,
        Identity: metadata.identity,
        Generation: metadata.generation,
        Instagram: metadata.instagram,
        "Stripe Payment Intent ID": paymentIntentId,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable error: ${res.status} ${body}`);
  }

  console.log(`Member ${metadata.psuEmail} added to Airtable`);
}
