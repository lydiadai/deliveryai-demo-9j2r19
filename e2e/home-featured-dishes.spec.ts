import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

const featuredSection = (page: Page) => page.locator('section[aria-labelledby="featured-dishes-title"]')

const zhDishes = [
  { name: '鎏金番茄鸳鸯锅', badge: '人气 No.1', price: '¥68.00' },
  { name: '牛油麻辣锅', badge: '招牌', price: '¥59.00' },
  { name: '琥珀嫩牛肉', badge: '主厨推荐', price: '¥42.00' },
]

const enDishes = [
  { name: 'Golden Tomato Dual-Flavor Pot', badge: 'Top Pick', price: '¥68.00' },
  { name: 'Beef Tallow Spicy Pot', badge: 'Signature', price: '¥59.00' },
  { name: 'Amber Tender Beef', badge: "Chef's Choice", price: '¥42.00' },
]

async function openHome(page: Page, options: { language?: 'zh' | 'en', elderly?: boolean } = {}) {
  const language = options.language ?? 'zh'
  const elderly = options.elderly ?? false

  await page.addInitScript(({ language: initialLanguage, elderly: elderlyMode }) => {
    localStorage.setItem('i18nextLng', initialLanguage)
    localStorage.setItem('elderly-mode', elderlyMode ? 'true' : 'false')
  }, { language, elderly })

  await page.goto('/#/home')
  await expect(page).toHaveURL(/#\/home$/)
}

async function expectFullyInViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  if (!box || !viewport) return

  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

async function expectBelowViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  if (!box || !viewport) return

  expect(box.y).toBeGreaterThanOrEqual(viewport.height)
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

async function expectCardsDoNotOverlap(cards: Locator) {
  const boxes = await cards.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect()
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
  }))

  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1]
    const current = boxes[index]
    const separatedHorizontally = previous.right <= current.left
    const separatedVertically = previous.bottom <= current.top || current.bottom <= previous.top
    expect(separatedHorizontally || separatedVertically).toBe(true)
  }
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage }),
    contentType: 'image/png',
  })
}

async function mockFeaturedProductIds(page: Page, ids: string[]) {
  await page.route('**/src/data/menu.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const declaration = /const featuredProductIds = \[[^\]]*\];/
    if (!declaration.test(source)) {
      throw new Error('无法在 Vite 转换后的菜单模块中定位 featuredProductIds')
    }

    await route.fulfill({
      response,
      body: source.replace(declaration, `const featuredProductIds = ${JSON.stringify(ids)};`),
      headers: { ...response.headers(), 'content-type': 'application/javascript' },
    })
  })
}

test.describe('首页推荐菜移至桌面端首屏以下 - E2E 验收测试', () => {
  test('REQ-002: 中文推荐菜内容、顺序和字段正确', async ({ page }) => {
    await openHome(page)
    const section = featuredSection(page)
    const cards = section.locator('article')

    await expect(page.getByRole('heading', { name: '今日推荐' })).toBeVisible()
    await expect(cards).toHaveCount(3)
    expect(await cards.locator('h3').allTextContents()).toEqual(zhDishes.map(({ name }) => name))

    for (const [index, dish] of zhDishes.entries()) {
      const card = cards.nth(index)
      await expect(card.getByRole('heading', { name: dish.name })).toBeVisible()
      await expect(card.getByRole('img', { name: dish.name })).toBeVisible()
      await expect(card).toContainText(dish.badge)
      await expect(card).toContainText(`${dish.price} 起`)
    }
  })

  test('REQ-001 / NFR-001: 1280x720 首屏不展示推荐菜且滚动后完整可见', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await openHome(page)
    const section = featuredSection(page)
    const cards = section.locator('article')

    await expectBelowViewport(page.getByRole('heading', { name: '今日推荐' }), page)
    for (let index = 0; index < 3; index += 1) {
      await expectBelowViewport(cards.nth(index), page)
    }
    await expectFullyInViewport(page.getByRole('button', { name: '快速进入 A08 桌' }), page)
    await expect(page.getByRole('button', { name: /B12/ })).toBeEnabled()
    await expectNoPageHorizontalOverflow(page)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await attachScreenshot(page, testInfo, 'desktop-1280x720-homepage-first-screen')

    await section.evaluate((node) => node.scrollIntoView())
    await expectFullyInViewport(page.getByRole('heading', { name: '今日推荐' }), page)
    for (let index = 0; index < 3; index += 1) {
      await expectFullyInViewport(cards.nth(index), page)
    }
    await attachScreenshot(page, testInfo, 'desktop-1280x720-homepage-featured-dishes')
  })

  test('REQ-001: 1024px 临界宽度与老人模式均保持推荐菜在首屏以下', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 })
    await openHome(page)
    await expectBelowViewport(page.getByRole('heading', { name: '今日推荐' }), page)

    const elderlyPage = await page.context().newPage()
    await elderlyPage.setViewportSize({ width: 1024, height: 600 })
    await openHome(elderlyPage, { elderly: true })
    await expect(elderlyPage.locator('html')).toHaveClass(/elderly/)
    await expectBelowViewport(elderlyPage.getByRole('heading', { name: '今日推荐' }), elderlyPage)
    await elderlyPage.close()
  })

  test('REQ-003 / NFR-001: 390x844 推荐菜与桌台入口正常展示且页面无横向溢出', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHome(page)
    const section = featuredSection(page)
    const cards = section.locator('article')

    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await section.evaluate((node) => node.scrollIntoView())
    await expectFullyInViewport(page.getByRole('heading', { name: '今日推荐' }), page)
    await expectFullyInViewport(cards.first(), page)
    await expect(cards.first().locator('..')).toHaveCSS('overflow-x', 'auto')
    await expectNoPageHorizontalOverflow(page)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await attachScreenshot(page, testInfo, 'mobile-390x844-homepage')
  })

  test('REQ-002: 推荐卡片只读且点击后页面状态不变', async ({ page }) => {
    await openHome(page)
    const cards = featuredSection(page).locator('article')
    const initialUrl = page.url()

    await expect(cards.locator('button, a, [role="button"]')).toHaveCount(0)
    for (let index = 0; index < 3; index += 1) {
      await expect(cards.nth(index)).toHaveCSS('cursor', 'auto')
      await cards.nth(index).click()
      await expect(page).toHaveURL(initialUrl)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: '今日推荐' })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: /B12/ })).toBeEnabled()
  })

  test('REQ-003: B12 桌台与快速进入 A08 的既有链路保持正常', async ({ page }) => {
    await openHome(page)
    await page.getByRole('button', { name: /B12/ }).click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await expect(page.getByText('您在 B12 · 卡座')).toBeVisible()

    await page.goto('/#/home')
    await page.getByRole('button', { name: '快速进入 A08 桌' }).click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await expect(page.getByText('您在 A08 · 大厅')).toBeVisible()
  })

  test('REQ-001 / REQ-002 / NFR-002: 英文桌面首屏隐藏且滚动后内容正确', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await openHome(page, { language: 'en' })
    const section = featuredSection(page)
    const cards = section.locator('article')

    await expectBelowViewport(page.getByRole('heading', { name: "Today's Picks" }), page)
    await section.evaluate((node) => node.scrollIntoView())
    await expectFullyInViewport(page.getByRole('heading', { name: "Today's Picks" }), page)
    expect(await cards.locator('h3').allTextContents()).toEqual(enDishes.map(({ name }) => name))
    for (const [index, dish] of enDishes.entries()) {
      const card = cards.nth(index)
      await expect(card.getByRole('img', { name: dish.name })).toBeVisible()
      await expect(card).toContainText(dish.badge)
      await expect(card).toContainText(`${dish.price} from`)
      await expectFullyInViewport(card, page)
    }
    await expectNoPageHorizontalOverflow(page)
    await attachScreenshot(page, testInfo, 'english-desktop-1280x720')

    await page.setViewportSize({ width: 390, height: 844 })
    await section.evaluate((node) => node.scrollIntoView())
    await expectFullyInViewport(page.getByRole('heading', { name: "Today's Picks" }), page)
    await expectFullyInViewport(cards.first(), page)
    await expectNoPageHorizontalOverflow(page)
    await attachScreenshot(page, testInfo, 'english-mobile-390x844')
  })

  test('REQ-002 / NFR-002: 图片 alt 本地化且只读卡片不进入 Tab 顺序', async ({ page }) => {
    await openHome(page)
    const cards = featuredSection(page).locator('article')

    for (const dish of zhDishes) {
      await expect(page.getByRole('img', { name: dish.name })).toHaveAttribute('alt', dish.name)
    }
    await expect(cards.locator('[tabindex], button, a, input, select, textarea')).toHaveCount(0)

    for (let index = 0; index < 7; index += 1) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => document.activeElement?.closest('article') === null)).toBe(true)
    }
  })

  test('NFR-001 / NFR-002: 320px 与老人模式无重叠或页面级横向溢出', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await openHome(page)
    let cards = featuredSection(page).locator('article')

    await expectNoPageHorizontalOverflow(page)
    await expectCardsDoNotOverlap(cards)
    await attachScreenshot(page, testInfo, 'narrow-320px-homepage', true)

    const elderlyPage = await page.context().newPage()
    await elderlyPage.setViewportSize({ width: 390, height: 844 })
    await openHome(elderlyPage, { elderly: true })
    cards = featuredSection(elderlyPage).locator('article')
    await expect(elderlyPage.locator('html')).toHaveClass(/elderly/)
    await expect(elderlyPage.getByRole('heading', { name: '今日推荐' })).toBeVisible()
    await expectNoPageHorizontalOverflow(elderlyPage)
    await expectCardsDoNotOverlap(cards)
    await attachScreenshot(elderlyPage, testInfo, 'elderly-390x844-homepage', true)
    await elderlyPage.close()
  })

  test('REQ-002: 无效推荐 ID 被跳过且有效项保持原顺序', async ({ page }) => {
    await mockFeaturedProductIds(page, ['p1', 'missing-product', 'p3'])
    await openHome(page)
    const cards = featuredSection(page).locator('article')

    await expect(cards).toHaveCount(2)
    expect(await cards.locator('h3').allTextContents()).toEqual(['鎏金番茄鸳鸯锅', '琥珀嫩牛肉'])
  })

  test('REQ-002: 推荐 ID 全部无效时隐藏推荐区且桌台绑定可用', async ({ page }) => {
    await mockFeaturedProductIds(page, ['missing-1', 'missing-2', 'missing-3'])
    await openHome(page)

    await expect(featuredSection(page)).toHaveCount(0)
    await page.getByRole('button', { name: /B12/ }).click()
    await expect(page).toHaveURL(/#\/welcome$/)
    await expect(page.getByText('您在 B12 · 卡座')).toBeVisible()
  })
})
