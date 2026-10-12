import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState, Field, Pagination } from './ui';

describe('Pagination', () => {
  const hrefFor = (p: number) => `/x?page=${p}`;

  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} limit={12} total={5} hrefFor={hrefFor} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links to neighbours and tells the user where they are', () => {
    render(<Pagination page={2} limit={12} total={30} hrefFor={hrefFor} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/x?page=1');
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('href', '/x?page=3');
  });

  it('has no Previous on the first page and no Next on the last', () => {
    const { rerender } = render(<Pagination page={1} limit={12} total={30} hrefFor={hrefFor} />);
    expect(screen.queryByRole('link', { name: /Previous/ })).not.toBeInTheDocument();
    rerender(<Pagination page={3} limit={12} total={30} hrefFor={hrefFor} />);
    expect(screen.queryByRole('link', { name: /Next/ })).not.toBeInTheDocument();
  });
});

describe('Pagination numbers', () => {
  it('links numbered pages, marks the current one and collapses gaps', () => {
    render(<Pagination page={5} limit={10} total={100} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute('href', '/x?page=1');
    expect(screen.getByRole('link', { name: 'Page 10' })).toHaveAttribute('href', '/x?page=10');
    expect(screen.getByRole('link', { name: 'Page 4' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Page 2' })).not.toBeInTheDocument();
    expect(screen.getByText('5', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('connects label, control and error message', () => {
    render(
      <Field id="f" label="Email" error="Required">
        {(aria) => <input {...aria} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });
});

describe('ErrorState', () => {
  it('is announced as an alert and offers a retry', async () => {
    const retry = jest.fn();
    render(<ErrorState message="Boom" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
