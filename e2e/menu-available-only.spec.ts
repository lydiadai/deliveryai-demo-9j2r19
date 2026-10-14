import { expect, test, type Page } from '@playwright/test'

async function openMenu(page: Page, options: { language?: 'zh' | 'en'; elderly?: boolean } = {}) {
  const language = options.language ?? 'zh'
  const elderly = options.elderly ?? false

  await page.addInitScript(({ initialLanguage, elderlyMode }) => {
    localStorage.setItem('i18nextLng', initialLanguage)
    localStorage.setItem('elderly-mode', elderlyMode ? 'true' : 'false')
  }, { initialLanguage: language, elderlyMode: elderly })

  await page.goto('/#/menu')
  await expect(page).toHaveURL(/#\/menu$/)
}

const availableToggle = (page: Page, name = '仅看可点') => page.getByRole('button', { name, exact: true })

const productCard = (page: Page, name: string) => page.locator('article').filter({
  has: page.getByRole('heading', { name, exact: true }),
})

test.describe('菜单页仅看可点菜品 - E2E 验收测试', () => {
  test('REQ-001 / REQ-006: 默认展示售罄菜品，开启后隐藏且关闭后恢复', async ({ page }) => {
    await openMenu(page)
    const toggle = availableToggle(page)
    const soldOutCard = productCard(page, '山野菌菇拼盘')

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(soldOutCard).toBeVisible()
    await expect(soldOutCard).toContainText('今日售罄')
    await expect(soldOutCard.locator('button')).toBeDisabled()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(soldOutCard).toHaveCount(0)
    await expect(productCard(page, '田园蔬菜拼盘')).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(soldOutCard).toBeVisible()
    await expect(soldOutCard.locator('button')).toBeDisabled()
  })

  test('REQ-001: 分类、搜索与可点条件按交集生效且切换条件不关闭筛选', async ({ page }) => {
    await openMenu(page)
    const toggle = availableToggle(page)
    const search = page.getByPlaceholder('搜索锅底、菜品或饮品')

    await page.getByRole('button', { name: '蔬菜豆品', exact: true }).click()
    await toggle.click()
    await expect(productCard(page, '田园蔬菜拼盘')).toBeVisible()
    await expect(productCard(page, '山野菌菇拼盘')).toHaveCount(0)

    await search.fill('田园')
    await expect(page.locator('article')).toHaveCount(1)
    await expect(productCard(page, '田园蔬菜拼盘')).toBeVisible()

    await search.fill('菌菇')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('暂无符合条件的菜品', { exact: true })).toBeVisible()
  })

  test('REQ-002: 演示控制台动态售罄会即时移除和恢复可点菜品', async ({ page }) => {
    await openMenu(page)
    const toggle = availableToggle(page)

    await toggle.click()
    await expect(productCard(page, '鎏金番茄鸳鸯锅')).toBeVisible()

    await page.getByRole('button', { name: '演示控制台', exact: true }).click()
    await page.getByRole('button', { name: '鎏金番茄鸳鸯锅', exact: true }).click()
    await page.getByRole('button', { name: '完成设置', exact: true }).click()
    await expect(productCard(page, '鎏金番茄鸳鸯锅')).toHaveCount(0)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: '演示控制台', exact: true }).click()
    await page.getByRole('button', { name: '鎏金番茄鸳鸯锅', exact: true }).click()
    await page.getByRole('button', { name: '完成设置', exact: true }).click()
    await expect(productCard(page, '鎏金番茄鸳鸯锅')).toBeVisible()
  })

  test('REQ-003: 无结果空态可一键恢复推荐分类、空搜索与关闭状态', async ({ page }) => {
    await openMenu(page)
    const toggle = availableToggle(page)
    const search = page.getByPlaceholder('搜索锅底、菜品或饮品')
    const recommended = page.getByRole('button', { name: '推荐', exact: true })

    await page.getByRole('button', { name: '蔬菜豆品', exact: true }).click()
    await search.fill('山野菌菇')
    await toggle.click()

    await expect(page.locator('article')).toHaveCount(0)
    await expect(page.getByText('暂无符合条件的菜品', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '清除筛选', exact: true }).click()

    await expect(search).toHaveValue('')
    await expect(recommended).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('article')).toHaveCount(10)
    await expect(productCard(page, '山野菌菇拼盘')).toContainText('今日售罄')
  })

  test('REQ-004: 刷新以及离开菜单后重进都会恢复默认关闭', async ({ page }) => {
    await openMenu(page)

    await availableToggle(page).click()
    await expect(availableToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(availableToggle(page)).toHaveAttribute('aria-pressed', 'false')

    await availableToggle(page).click()
    await page.getByRole('button', { name: '订单', exact: true }).click()
    await expect(page).toHaveURL(/#\/order$/)
    await page.getByRole('button', { name: '点餐', exact: true }).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(availableToggle(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('REQ-005 / NFR-002 / NFR-003: 英文老人模式支持键盘操作且无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMenu(page, { language: 'en', elderly: true })
    const toggle = availableToggle(page, 'Available only')

    await expect(page.locator('html')).toHaveClass(/elderly/)
    await toggle.focus()
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await page.getByPlaceholder('Search broth, dishes or drinks').fill('no matching dish')
    await expect(page.getByText('No dishes match your filters', { exact: true })).toBeVisible()
    const clearButton = page.getByRole('button', { name: 'Clear filters', exact: true })
    await clearButton.focus()
    await expect(clearButton).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('No dishes match your filters', { exact: true })).toHaveCount(0)

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(widths.scroll).toBeLessThanOrEqual(widths.client)
  })
})
