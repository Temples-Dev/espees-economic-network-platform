import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import ConversationScreen from '@/app/conversation/[id]';
import { ApiError } from '@/lib/api';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockBack = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'me', email: 'me@x.co', full_name: 'Me' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
    useLocalSearchParams: () => ({ id: 'c1' }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const me = { id: 'me', email: 'me@x.co', full_name: 'Me' };
const ama = { id: 'a', email: 'ama@x.co', full_name: 'Ama Mensah' };
const now = Date.now();
const msg = (id: string, sender: typeof me, body: string, ago: number) => ({
  id, sender: sender.id, sender_email: sender.email, sender_full_name: sender.full_name, body,
  read_at: null, created_at: new Date(now - ago).toISOString(),
});
const DETAIL = {
  id: 'c1', initiator: me, other_party: ama, business: 'b1', business_name: 'Mama Tees', order: null, order_id: null,
  campaign: null, campaign_title: null, last_message_at: null, unread_count: 1, created_at: '2026-09-01T00:00:00Z',
  messages: [msg('m1', ama, 'Is the tee in stock?', 3600000), msg('m2', me, 'Yes, sizes M and L.', 1800000)],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(DETAIL);
  mockPost.mockImplementation(async (path: string, body?: { body?: string }) =>
    path.endsWith('/read/') ? { marked_read: 1 } : msg('m3', me, body?.body ?? '', 0),
  );
});

describe('ConversationScreen', () => {
  it('shows the other person, the context and the message history', async () => {
    await render(<ConversationScreen />);
    expect(await screen.findByText('Is the tee in stock?')).toBeTruthy();
    expect(screen.getByText('Yes, sizes M and L.')).toBeTruthy();
    expect(screen.getByText('Ama Mensah')).toBeTruthy();
    expect(screen.getByText('Mama Tees')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/conversations/c1/');
  });

  it('marks incoming messages read when opened', async () => {
    await render(<ConversationScreen />);
    await screen.findByText('Is the tee in stock?');
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/v1/conversations/c1/read/', {}));
  });

  it('sends a message, appends it and clears the box', async () => {
    const user = userEvent.setup();
    await render(<ConversationScreen />);
    await screen.findByText('Is the tee in stock?');
    await user.type(screen.getByLabelText('Message'), 'Great, I will pay now');
    await user.press(screen.getByLabelText('Send message'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/conversations/c1/messages/', { body: 'Great, I will pay now' });
    expect(await screen.findByText('Great, I will pay now')).toBeTruthy();
    expect(screen.getByLabelText('Message').props.value).toBe('');
  });

  it('will not send an empty message', async () => {
    await render(<ConversationScreen />);
    await screen.findByText('Is the tee in stock?');
    expect(screen.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true);
  });

  it('shows the message at once as sending', async () => {
    let release: (v: unknown) => void = () => undefined;
    mockPost.mockImplementation((path: string, body?: { body?: string }) =>
      path.endsWith('/read/') ? Promise.resolve({}) : new Promise((r) => { release = () => r(msg('m9', me, body?.body ?? '', 0)); }),
    );
    const user = userEvent.setup();
    await render(<ConversationScreen />);
    await screen.findByText('Is the tee in stock?');
    await user.type(screen.getByLabelText('Message'), 'On my way');
    await user.press(screen.getByLabelText('Send message'));
    expect(screen.getByText('On my way')).toBeTruthy();
    expect(screen.getByLabelText('Sending')).toBeTruthy();
    release(null);
    await waitFor(() => expect(screen.getAllByLabelText('Sent')).toHaveLength(2)); // the earlier reply plus this one
  });

  it('marks a failed message and retries it on tap', async () => {
    mockPost.mockImplementation(async (path: string, body?: { body?: string }) => {
      if (path.endsWith('/read/')) return {};
      throw new ApiError(400, { detail: 'Too long.' });
    });
    const user = userEvent.setup();
    await render(<ConversationScreen />);
    await screen.findByText('Is the tee in stock?');
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.press(screen.getByLabelText('Send message'));
    expect(await screen.findByLabelText('Failed to send. Tap to retry')).toBeTruthy();
    expect(screen.getByText('Too long.')).toBeTruthy();
    mockPost.mockImplementation(async (_p: string, body?: { body?: string }) => msg('m10', me, body?.body ?? '', 0));
    await user.press(screen.getByLabelText('Failed to send. Tap to retry'));
    await waitFor(() => expect(screen.getAllByLabelText('Sent')).toHaveLength(2));
    expect(screen.queryByLabelText('Failed to send. Tap to retry')).toBeNull();
  });

  it('shows read receipts on your messages', async () => {
    mockGet.mockResolvedValue({
      ...DETAIL,
      messages: [
        { ...msg('m1', me, 'first', 7200000), read_at: new Date(now - 3600000).toISOString() },
        msg('m2', me, 'second', 1800000),
      ],
    });
    await render(<ConversationScreen />);
    await screen.findByText('first');
    expect(screen.getByLabelText('Read')).toBeTruthy();
    expect(screen.getByLabelText('Sent')).toBeTruthy();
  });

  it('shows the other person avatar once per run of their messages', async () => {
    mockGet.mockResolvedValue({
      ...DETAIL,
      messages: [msg('m1', ama, 'one', 3000000), msg('m2', ama, 'two', 2900000), msg('m3', me, 'reply', 1000000)],
    });
    await render(<ConversationScreen />);
    await screen.findByText('one');
    expect(screen.getAllByTestId('bubble-avatar')).toHaveLength(1);
  });

  it('goes back', async () => {
    const user = userEvent.setup();
    await render(<ConversationScreen />);
    await user.press(await screen.findByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
