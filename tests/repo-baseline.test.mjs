import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'

async function pathExists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

test('classic-only repo baseline remains intact', async () => {
  assert.equal(await pathExists('app/ux-v2'), false, 'app/ux-v2 should not exist')
  assert.equal(await pathExists('components/v2'), false, 'components/v2 should not exist')
  assert.equal(await pathExists('middleware.ts'), false, 'middleware.ts should be removed after proxy migration')
  assert.equal(await pathExists('proxy.ts'), true, 'proxy.ts should exist')
})

test('database baseline includes security and transactional functions', async () => {
  const content = await readFile('database/20260326_security_baseline.sql', 'utf8')

  for (const requiredSnippet of [
    'create or replace function public.app_current_company_id()',
    'alter table public.employees enable row level security;',
    'create or replace function public.replace_workday_project_entries(',
    'create or replace function public.replace_travel_expense_entries(',
    'create or replace function public.replace_employee_travel_project_routes(',
    'create or replace function public.replace_employee_filter_group_members(',
  ]) {
    assert.ok(
      content.includes(requiredSnippet),
      `security baseline migration should include: ${requiredSnippet}`
    )
  }
})
