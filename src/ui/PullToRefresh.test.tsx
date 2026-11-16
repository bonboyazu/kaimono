import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import PullToRefresh from './PullToRefresh.tsx';

const touch = (y: number) => ({ touches: [{ clientY: y }] });

test('上で下に引っ張って離すと更新する', () => {
  const onRefresh = vi.fn();
  render(<PullToRefresh onRefresh={onRefresh} />);
  fireEvent.touchStart(window, touch(100));
  fireEvent.touchMove(window, touch(300));
  expect(screen.getByText('離すと更新')).toBeInTheDocument();
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(screen.getByText('更新しています')).toBeInTheDocument();
});

test('少しだけ引っ張ったときは更新しない', () => {
  const onRefresh = vi.fn();
  render(<PullToRefresh onRefresh={onRefresh} />);
  fireEvent.touchStart(window, touch(100));
  fireEvent.touchMove(window, touch(130));
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).not.toHaveBeenCalled();
});

test('入力の画面の中で引っ張っても更新しない', () => {
  const onRefresh = vi.fn();
  render(<><PullToRefresh onRefresh={onRefresh} /><div className="sheet-backdrop"><p>中</p></div></>);
  fireEvent.touchStart(screen.getByText('中'), touch(100));
  fireEvent.touchMove(window, touch(300));
  fireEvent.touchEnd(window, { touches: [] });
  expect(onRefresh).not.toHaveBeenCalled();
});
