import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

/**
 * The product ships light-only, matching the brand site.
 *
 * The dark token set is still defined in index.css, so switching back is a
 * matter of restoring the toggle here — nothing else needs to change. The
 * attribute is written on every mount so the `prefers-color-scheme: dark`
 * pre-hydration block can never take effect on a user whose OS is dark.
 */
export const ThemeProvider = ({ children }) => {
  const theme = 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#ffffff');
  }, []);

  // Kept so callers that still ask for a toggle don't have to branch.
  const noop = () => {};

  return (
    <ThemeContext.Provider
      value={{ theme, preference: theme, isDark: false, toggleTheme: noop, setTheme: noop }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
