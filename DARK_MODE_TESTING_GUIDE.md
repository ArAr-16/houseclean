# Dark Mode Testing & Verification Guide

## Quick Start Testing

### 1. **Theme Toggle Verification**

#### Test: Toggle Button Visibility
- [ ] Navigate to any public page (Home, Services, Blog, etc.)
- [ ] Look for sun/moon emoji button in bottom-right corner
- [ ] Button should be floating and visible at all times

#### Test: Click Toggle
- [ ] Click the sun/moon emoji button
- [ ] Verify entire page background changes to dark
- [ ] Verify all text becomes lighter
- [ ] Verify navigation bar becomes darker
- [ ] Click again to return to light mode

#### Test: Visual Feedback
- [ ] Theme should change instantly
- [ ] Transition should be smooth (no flashing)
- [ ] Emoji should change (sun ☀️ ↔️ moon 🌙)

---

### 2. **Page-by-Page Testing**

#### Home Page (`/`)
- [ ] Hero section background dark in night mode
- [ ] Text readable in both modes
- [ ] Buttons have proper contrast
- [ ] Call-to-action button visible and clickable
- [ ] Responsive at all breakpoints (1280px, 1024px, 768px, 480px)

#### Services Page (`/services`)
- [ ] Service cards have dark background in night mode
- [ ] Service titles readable
- [ ] Icons visible in both modes
- [ ] Hover effects work in both modes
- [ ] Responsive card layout maintained

#### Blog Page (`/blog`)
- [ ] Blog post cards styled in dark mode
- [ ] Text contrast is sufficient
- [ ] Post titles stand out
- [ ] Post dates/metadata readable
- [ ] Images display properly

#### Contact Page (`/contact`)
- [ ] Contact form inputs have dark background in night mode
- [ ] Form labels are visible
- [ ] Input focus states are clear
- [ ] Submit button is prominently styled
- [ ] Contact info section styled correctly

#### Login/Register Pages (`/login`, `/register`)
- [ ] Form container has dark background
- [ ] Input fields are styled appropriately
- [ ] Labels are readable
- [ ] Error messages visible
- [ ] Success messages visible
- [ ] Links (recovery, signup) are colored/underlined

#### About Page (`/about`)
- [ ] About content container has dark background
- [ ] Heading underline color changes
- [ ] Text is readable
- [ ] Brand text highlighting works
- [ ] Border styling preserves in dark mode

---

### 3. **Component Testing**

#### Navigation Bar
```
Test: Dark Mode Navbar
- [ ] Background is very dark (#0f1729)
- [ ] Navigation links are light colored
- [ ] Hover effect works (gold #f1b856)
- [ ] Active link is highlighted
- [ ] Logo is visible
- [ ] Login button has proper styling
```

#### Mobile Hamburger Menu (< 768px)
```
Test: Dark Mode Mobile Menu
- [ ] Hamburger icon (three lines) is visible
- [ ] Lines are white/light colored
- [ ] Click hamburger opens menu
- [ ] Menu background is dark
- [ ] Menu items are readable
- [ ] Menu items have hover effects
- [ ] Click hamburger again to close menu
```

#### Footer
```
Test: Dark Mode Footer
- [ ] Footer background is very dark
- [ ] Footer text is light and readable
- [ ] Footer is at bottom of page
- [ ] Responsive text sizing on mobile
```

#### Forms & Inputs
```
Test: Form Elements in Dark Mode
- [ ] Input field background is appropriate dark shade
- [ ] Text color is light/readable
- [ ] Placeholder text is visible
- [ ] Focus state shows blue border
- [ ] Focus shadow is visible but not distracting
- [ ] Labels are above/beside inputs and readable
- [ ] Select dropdowns show arrow icon
- [ ] Textareas have proper sizing handle
```

#### Buttons
```
Test: Button Styling in Dark Mode
- [ ] Primary buttons have teal color (#13829f)
- [ ] Hover effect lifts button (translateY)
- [ ] Click/active state is visible
- [ ] Disabled buttons are grayed out
- [ ] Button text is readable
- [ ] Ghost buttons have light background
```

#### Tables (Admin/Customer Pages)
```
Test: Table Styling
- [ ] Table background is dark
- [ ] Header background is darker
- [ ] Row text is readable
- [ ] Alternating row colors are subtle
- [ ] Hover effect on rows is visible
- [ ] Borders are subtle but visible
```

#### Modals/Overlays
```
Test: Modal Styling in Dark Mode
- [ ] Modal backdrop is dark semi-transparent
- [ ] Modal content has dark background
- [ ] Modal title is readable
- [ ] Modal body text is readable
- [ ] Buttons inside modal are properly styled
- [ ] Close button (X) is visible
```

---

### 4. **Theme Persistence Testing**

#### Test: Reload Persistence
```
Steps:
1. Click theme toggle to dark mode
2. Refresh page (F5 or Ctrl+R)
3. Verify dark mode is still active
4. Reload again
5. Verify dark mode is still active
```

#### Test: Navigation Persistence
```
Steps:
1. Set dark mode on Home page
2. Navigate to Services page
3. Verify dark mode is still active
4. Navigate to Blog page
5. Verify dark mode is still active
6. Go back to Home page
7. Verify dark mode is still active
```

#### Test: Browser Close Persistence
```
Steps:
1. Set dark mode
2. Close browser completely
3. Reopen browser
4. Navigate to website
5. Verify dark mode is active
```

#### Test: localStorage Verification
```
Browser DevTools:
1. Right-click → Inspect → Application tab
2. Go to Local Storage → Select website URL
3. Look for 'darkMode' key
4. Value should be 'true' (in dark mode) or 'false' (in light mode)
5. Toggle theme
6. Value should change
```

---

### 5. **Mobile Responsiveness + Dark Mode**

#### Desktop (1280px+)
```
- [ ] Full navigation visible
- [ ] No hamburger menu
- [ ] All content fits without scrolling horizontally
- [ ] Dark mode working
```

#### Tablet (1024px)
```
- [ ] Navigation might compress slightly
- [ ] Logo smaller but visible
- [ ] Hamburger might appear
- [ ] Content readable
- [ ] Dark mode working
```

#### Mobile (768px)
```
- [ ] Hamburger menu visible
- [ ] Navigation in dropdown
- [ ] Logo small but visible
- [ ] Content responsive
- [ ] Single column layout for cards
- [ ] Dark mode working
```

#### Small Mobile (480px)
```
- [ ] Hamburger menu fully functional
- [ ] Extra small logo
- [ ] All text readable
- [ ] Buttons appropriately sized
- [ ] Images scale properly
- [ ] No horizontal scrolling
- [ ] Dark mode working
```

---

### 6. **Accessibility Testing**

#### Color Contrast
```
Light Mode (WCAG AA):
- Text on background: ✅ 4.5:1 ratio
- Large text: ✅ 3:1 ratio
- UI components: ✅ 3:1 ratio

Dark Mode (WCAG AA):
- Light text on dark bg: ✅ Should pass
- Use browser accessibility checker
```

#### Test in Browser DevTools:
```
Chrome/Edge:
1. Right-click → Inspect
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Run audit
5. Check contrast scores
```

#### Keyboard Navigation
```
- [ ] Tab key navigates through all interactive elements
- [ ] Enter activates buttons
- [ ] Space toggles checkboxes
- [ ] Arrow keys work in dropdowns
- [ ] Focus indicator visible in both modes
```

---

### 7. **Cross-Browser Testing**

#### Chrome/Edge (Chromium)
- [ ] Dark mode toggle works
- [ ] CSS variables applied
- [ ] Smooth transitions
- [ ] localStorage working
- [ ] Responsive design working

#### Firefox
- [ ] Dark mode toggle works
- [ ] CSS variables applied
- [ ] Scrollbar styling (if supported)
- [ ] localStorage working

#### Safari
- [ ] Dark mode toggle works
- [ ] CSS variables applied
- [ ] Smooth transitions
- [ ] localStorage working

#### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet
- [ ] Toggle works on all
- [ ] Responsive layout maintained

---

### 8. **Interactive Elements Testing**

#### Links
```
- [ ] Links are underlined or colored distinctly
- [ ] Visited links are distinguishable
- [ ] Hover effect is clear
- [ ] Focus state is visible
- [ ] Text decoration on hover
```

#### Badges & Status Indicators
```
- [ ] Success badge (green) visible
- [ ] Warning badge (orange) visible
- [ ] Error badge (red) visible
- [ ] Info badge (blue) visible
- [ ] Contrast ratios meet WCAG standards
```

#### Notifications/Alerts
```
- [ ] Success notification styled correctly
- [ ] Warning notification visible
- [ ] Error notification prominent
- [ ] Info notification clear
- [ ] Background and text colors appropriate
```

#### Progress Bars & Loaders
```
- [ ] Animated progress bar visible
- [ ] Color contrast sufficient
- [ ] Animation smooth
- [ ] Background/track visible
```

---

### 9. **Special Cases Testing**

#### Admin Dashboard
```
- [ ] Dashboard cards visible in dark mode
- [ ] Statistics display correctly
- [ ] Charts visible with proper colors
- [ ] Sidebar navigation styled
- [ ] All admin panels accessible
```

#### Staff Dashboard
```
- [ ] Request cards styled
- [ ] Schedule layout dark mode ready
- [ ] Form elements styled
- [ ] Navigation works
```

#### Customer Dashboard
```
- [ ] 3-column layout responsive
- [ ] Cards grid properly
- [ ] Booking wizard styled
- [ ] History table visible
- [ ] Payment info readable
```

#### Customer Account Page
```
- [ ] Profile section styled
- [ ] Settings/preferences visible
- [ ] Input fields styled
- [ ] Save button works and visible
```

---

### 10. **Performance Testing**

#### Load Time
```
- [ ] Page loads in < 3 seconds in light mode
- [ ] Page loads in < 3 seconds in dark mode
- [ ] Theme toggle is instant (no lag)
- [ ] Navigation smooth between pages
```

#### CSS Variable Application
```
- [ ] Variables applied instantly when toggling
- [ ] No flashing or color shift
- [ ] Transitions smooth over 0.2s
- [ ] All elements update simultaneously
```

#### Browser Performance
```
- [ ] No console errors
- [ ] No console warnings
- [ ] Smooth scrolling
- [ ] No jank on theme toggle
- [ ] Memory usage stable
```

---

## Automated Testing (Optional)

### Test Dark Mode Class Application
```javascript
test('toggles dark-mode class on document element', () => {
  const { rerender } = render(<App />);
  
  // Initially light mode
  expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  
  // Toggle to dark mode
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  
  expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
});
```

### Test localStorage Persistence
```javascript
test('persists dark mode preference in localStorage', () => {
  render(<App />);
  
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  
  expect(localStorage.getItem('darkMode')).toBe('true');
  
  fireEvent.click(toggle);
  
  expect(localStorage.getItem('darkMode')).toBe('false');
});
```

### Test CSS Variables
```javascript
test('applies correct CSS variables in dark mode', () => {
  render(<App />);
  const html = document.documentElement;
  
  // Light mode variables
  let bgColor = getComputedStyle(html).getPropertyValue('--bg-primary').trim();
  expect(bgColor).toBe('#ffffff');
  
  // Toggle to dark mode
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  
  // Dark mode variables
  bgColor = getComputedStyle(html).getPropertyValue('--bg-primary').trim();
  expect(bgColor).toBe('#1a1a2e');
});
```

---

## Bug Report Template

If you find issues, use this template:

```
**Title:** [Component] Dark Mode Not Applying to X

**Steps to Reproduce:**
1. Navigate to [Page/Component]
2. Toggle dark mode
3. Observe that [Element] is not styled

**Expected Behavior:**
The element should have dark background (#16213e) and light text

**Actual Behavior:**
The element retains light mode styling

**Browser/Device:**
Chrome v120 on Windows 10 (Desktop)

**Screenshot:**
[Attach screenshot if possible]

**Fixes Attempted:**
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Cleared browser cache
- [ ] Tested in incognito mode
```

---

## Performance Metrics Checklist

```
Dark Mode Performance:
- [ ] Theme toggle response: < 50ms
- [ ] CSS transition duration: 0.2s
- [ ] Page load time: < 3s
- [ ] CSS file size: < 100KB total
- [ ] localStorage read: < 10ms
- [ ] No layout shift on toggle
- [ ] Smooth 60fps transitions
```

---

## Sign-Off Checklist

- [ ] All pages tested in light mode
- [ ] All pages tested in dark mode
- [ ] Theme toggle works on all pages
- [ ] localStorage persistence verified
- [ ] Mobile responsiveness confirmed
- [ ] Cross-browser compatibility verified
- [ ] Accessibility verified
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Documentation complete

---

**Date Tested:** _______________
**Tested By:** _______________
**Issues Found:** ☐ None ☐ Minor ☐ Critical
**Status:** ☐ PASS ☐ PASS WITH NOTES ☐ NEEDS FIXES
