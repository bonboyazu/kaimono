import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import PullToRefresh from './PullToRefresh.tsx';

const touch = (y: number) => ({ touches: [{ clientY: y }] });

test('上で下に引っ張って離すと、終わるまでくるくるを出す', async () => {
  let finish = () => {};
  const onRefresh = vi.fn(() => new Promise<void>((r) => (finish = r)));
  render(<PullToRefresh onRefresh={onRefresh} />);
  fireEvent.touchStart(window, touch(100));
  fireEvent.touchMove(window, touch(300));
  expect(screen.getByRole('status', { name: '離すと更新' })).toBeInTheDocument();
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status', { name: '更新しています' })).toBeInTheDocument();
  await act(async () => finish());
  expect(screen.queryByRole('status')).toBeNull();
});

test('少しだけ引っ張ったときは更新しない', () => {
  const onRefresh = vi.fn(() => Promise.resolve());
  render(<PullToRefresh onRefresh={onRefresh} />);
  fireEvent.touchStart(window, touch(100));
  fireEvent.touchMove(window, touch(150));
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).not.toHaveBeenCalled();
});

test('入力の画面の中で引っ張っても更新しない', () => {
  const onRefresh = vi.fn(() => Promise.resolve());
  render(<><PullToRefresh onRefresh={onRefresh} /><div className="sheet-backdrop"><p>中</p></div></>);
  fireEvent.touchStart(screen.getByText('中'), touch(100));
  fireEvent.touchMove(window, touch(300));
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).not.toHaveBeenCalled();
});
