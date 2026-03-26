import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const guardedFiles = [
  [
    'app/admin/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/admin/import-actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/employees/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/projects/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/projects/[id]/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/travel-master/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/travel-expenses/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/api/travel-expenses/report/route.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/api/travel-expenses/report-excel/route.ts',
    ["'admin'", "'geschaeftsfuehrer'"],
  ],
  [
    'app/foreman/actions.ts',
    ["'admin'", "'geschaeftsfuehrer'", "'vorarbeiter'"],
  ],
]

test('critical server entry points enforce explicit role checks', async () => {
  for (const [file, expectedRoles] of guardedFiles) {
    const content = await readFile(file, 'utf8')

    assert.match(
      content,
      /requireCompanyContext\(\[/,
      `${file} should use explicit role restrictions`
    )

    for (const role of expectedRoles) {
      assert.ok(
        content.includes(role),
        `${file} should include role ${role}`
      )
    }
  }
})

test('html travel report disables caching', async () => {
  const content = await readFile('app/api/travel-expenses/report/route.ts', 'utf8')

  assert.ok(
    content.includes("'Cache-Control': 'no-store, private'"),
    'HTML travel report should disable private caching'
  )
})
