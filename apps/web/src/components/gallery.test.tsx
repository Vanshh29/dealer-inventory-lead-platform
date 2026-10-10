import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vehicle } from '@/test/fixtures';
import { Gallery } from './gallery';

const images = vehicle().images;

describe('Gallery', () => {
  it('shows the first photo and marks its thumbnail as current', () => {
    render(<Gallery images={images} title="VW Golf" />);
    expect(screen.getByAltText('VW Golf, photo 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show photo 1' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('navigates with buttons and wraps around', async () => {
    const user = userEvent.setup();
    render(<Gallery images={images} title="VW Golf" />);
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('VW Golf, photo 2 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('VW Golf, photo 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(screen.getByAltText('VW Golf, photo 2 of 2')).toBeInTheDocument();
  });

  it('is operable with the keyboard (arrow keys, tab to thumbnails)', async () => {
    const user = userEvent.setup();
    render(<Gallery images={images} title="VW Golf" />);
    await user.tab(); // prev
    await user.keyboard('{ArrowRight}');
    expect(screen.getByAltText('VW Golf, photo 2 of 2')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByAltText('VW Golf, photo 1 of 2')).toBeInTheDocument();
  });

  it('jumps to a photo via its thumbnail', async () => {
    const user = userEvent.setup();
    render(<Gallery images={images} title="VW Golf" />);
    await user.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(screen.getByAltText('VW Golf, photo 2 of 2')).toBeInTheDocument();
  });

  it('hides controls for a single photo and explains when there are none', () => {
    const { rerender } = render(<Gallery images={images.slice(0, 1)} title="VW Golf" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<Gallery images={[]} title="VW Golf" />);
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
  });
});
