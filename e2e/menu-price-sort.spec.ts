import { expect, test, type Page } from '@playwright/test'

const defaultOrder = [
  '鎏金番茄鸳鸯锅',
  '牛油麻辣锅',
  '琥珀嫩牛肉',
  '雪花肥牛卷',
  '鲜虾滑',
  '脆嫩毛肚',
  '田园蔬菜拼盘',
  '山野菌菇拼盘',
  '手工宽粉',
  '柠檬青桔饮',
]

const ascendingOrder = [
  '手工宽粉',
  '柠檬青桔饮',
  '田园蔬菜拼盘',
  '山野菌菇拼盘',
  '鲜虾滑',
  '琥珀嫩牛肉',
  '脆嫩毛肚',
  '雪花肥牛卷',
  '牛油麻辣锅',
  '鎏金番茄鸳鸯锅',
]

const descendingOrder = [...ascendingOrder].reverse()

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

const productNames = (page: Page) => page.locator('article h3').allTextContents()

async function mockProductPrice(page: Page, productId: string, priceExpression: string) {
  await page.route('**/src/data/menu.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const pricePattern = new RegExp(`(id:\\s*["']${productId}["'][\\s\\S]*?price:\\s*)\\d+(?:\\.\\d+)?`)
    if (!pricePattern.test(source)) {
      throw new Error(`无法在 Vite 转换后的菜单模块中定位 ${productId} 的价格`)
    }

    await route.fulfill({
      response,
      body: source.replace(pricePattern, `$1${priceExpression}`),
      headers: { ...response.headers(), 'content-type': 'application/javascript' },
    })
  })
}

test.describe('菜单价格排序 - E2E 验收测试', () => {
  test('REQ-001 / REQ-002: 默认、价格升序和价格降序即时切换且不修改默认顺序', async ({ page }) => {
    await openMenu(page)
    const defaultSort = page.getByRole('radio', { name: '默认排序', exact: true })
    const ascendingSort = page.getByRole('radio', { name: '价格从低到高', exact: true })
    const descendingSort = page.getByRole('radio', { name: '价格从高到低', exact: true })

    await expect(defaultSort).toHaveAttribute('aria-checked', 'true')
    expect(await productNames(page)).toEqual(defaultOrder)

    await ascendingSort.click()
    await expect(ascendingSort).toHaveAttribute('aria-checked', 'true')
    expect(await productNames(page)).toEqual(ascendingOrder)

    await descendingSort.click()
    await expect(descendingSort).toHaveAttribute('aria-checked', 'true')
    expect(await productNames(page)).toEqual(descendingOrder)

    await defaultSort.click()
    expect(await productNames(page)).toEqual(defaultOrder)
  })

  test('REQ-002: 同价菜品在升序和降序中均保持默认相对顺序', async ({ page }) => {
    await mockProductPrice(page, 'p2', '68')
    await openMenu(page)

    await page.getByRole('radio', { name: '价格从低到高', exact: true }).click()
    expect((await productNames(page)).slice(-2)).toEqual(['鎏金番茄鸳鸯锅', '牛油麻辣锅'])

    await page.getByRole('radio', { name: '价格从高到低', exact: true }).click()
    expect((await productNames(page)).slice(0, 2)).toEqual(['鎏金番茄鸳鸯锅', '牛油麻辣锅'])
  })

  test('REQ-003 / REQ-004: 排序作用于组合筛选结果且清除筛选恢复全部默认状态', async ({ page }) => {
    await openMenu(page)
    const ascendingSort = page.getByRole('radio', { name: '价格从低到高', exact: true })
    const availableOnly = page.getByRole('button', { name: '仅看可点', exact: true })
    const search = page.getByPlaceholder('搜索锅底、菜品或饮品')

    await ascendingSort.click()
    await page.getByRole('button', { name: '蔬菜豆品', exact: true }).click()
    expect(await productNames(page)).toEqual(['田园蔬菜拼盘', '山野菌菇拼盘'])

    await availableOnly.click()
    await search.fill('菌菇')
    await expect(page.getByText('暂无符合条件的菜品', { exact: true })).toBeVisible()
    await expect(ascendingSort).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('button', { name: '清除筛选', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(availableOnly).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: '推荐', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('radio', { name: '默认排序', exact: true })).toHaveAttribute('aria-checked', 'true')
    expect(await productNames(page)).toEqual(defaultOrder)
  })

  test('REQ-004: 刷新及离开菜单后重进均恢复默认排序', async ({ page }) => {
    await openMenu(page)
    await page.getByRole('radio', { name: '价格从高到低', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('radio', { name: '默认排序', exact: true })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('radio', { name: '价格从高到低', exact: true }).click()
    await page.getByRole('button', { name: '订单', exact: true }).click()
    await expect(page).toHaveURL(/#\/order$/)
    await page.getByRole('button', { name: '点餐', exact: true }).click()
    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('radio', { name: '默认排序', exact: true })).toHaveAttribute('aria-checked', 'true')
  })

  test('REQ-005 / NFR-002: 英文老人模式下支持方向键选择且移动端无页面横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMenu(page, { elderly: true })
    const defaultSort = page.getByRole('radio', { name: '默认排序', exact: true })

    await expect(page.locator('html')).toHaveClass(/elderly/)
    await defaultSort.focus()
    await page.keyboard.press('ArrowRight')
    const ascendingSort = page.getByRole('radio', { name: '价格从低到高', exact: true })
    await expect(ascendingSort).toBeFocused()
    await expect(ascendingSort).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('button', { name: '切换语言', exact: true }).click()
    const englishAscendingSort = page.getByRole('radio', { name: 'Price: Low to High', exact: true })
    await expect(englishAscendingSort).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: 'Default', exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Price: High to Low', exact: true })).toBeVisible()

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(widths.scroll).toBeLessThanOrEqual(widths.client)
  })

  test('REQ-002 / REQ-005: 非有限价格触发默认顺序与默认选中态安全回退', async ({ page }) => {
    await mockProductPrice(page, 'p2', 'Number.NaN')
    await openMenu(page)

    await page.getByRole('radio', { name: '价格从低到高', exact: true }).click()
    await expect(page.getByRole('radio', { name: '默认排序', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('article')).toHaveCount(10)
    expect(await productNames(page)).toEqual(defaultOrder)
    const invalidPriceCard = page.locator('article').filter({ has: page.getByRole('heading', { name: '牛油麻辣锅', exact: true }) })
    await expect(invalidPriceCard.locator('button')).toBeEnabled()
  })
})
