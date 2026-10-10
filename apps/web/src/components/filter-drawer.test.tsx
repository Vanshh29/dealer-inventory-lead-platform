import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterDrawer } from './filter-drawer';

const setup = (activeCount = 0) =>
  render(
    <FilterDrawer activeCount={activeCount}>
      <form aria-label="inner">
        <input aria-label="Search" />
        <button type="submit">Show results</button>
      </form>
    </FilterDrawer>,
  );

describe('FilterDrawer', () => {
  it('starts closed: the button says so and the filters are not a dialog', () => {
    setup();
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the three-line button as a modal dialog and focuses its close button', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Close filters' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden'); // page does not scroll behind it
  });

  it('closes with the close button, with Escape, and returns focus to the opener', async () => {
    const user = userEvent.setup();
    setup();
    const opener = screen.getByRole('button', { name: /Filters/ });

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside the open drawer', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    // close -> search -> show results -> (wraps) close
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show results' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close filters' })).toHaveFocus();
  });

  it('shows how many filters are active, for screen readers too', () => {
    setup(3);
    expect(screen.getByRole('button', { name: 'Filters 3 active' })).toBeInTheDocument();
  });
});
