import { render, screen, userEvent } from '@testing-library/react-native';

import CommunityScreen from '@/app/(tabs)/community';

const mockGetList = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'me', email: 'me@x.co', full_name: 'Me' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getList: (...a: unknown[]) => mockGetList(...a) },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const me = { id: 'me', email: 'me@x.co', full_name: 'Me' };
const CONVOS = [
  { id: 'c1', initiator: me, other_party: { id: 'a', email: 'ama@x.co', full_name: 'Ama Mensah' }, business: 'b1', business_name: 'Mama Tees', order: null, order_id: null, campaign: null, campaign_title: null, last_message_at: '2026-09-20T10:00:00Z', last_message: 'Is the tee in stock?', last_message_sender: 'a', unread_count: 2, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c2', initiator: { id: 'k', email: 'kofi@x.co', full_name: 'Kofi Tech' }, other_party: me, business: null, business_name: null, order: null, order_id: null, campaign: 'x', campaign_title: 'Solar Farm', last_message_at: '2026-09-10T10:00:00Z', last_message: 'Count me in', last_message_sender: 'me', unread_count: 0, created_at: '2026-09-01T00:00:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetList.mockResolvedValue(CONVOS);
});

describe('CommunityScreen', () => {
  it('lists conversations with the other person, their context and unread count', async () => {
    await render(<CommunityScreen />);
    expect(await screen.findByText('Ama Mensah')).toBeTruthy();
    expect(screen.getByText('Kofi Tech')).toBeTruthy();
    expect(screen.getByText('Mama Tees')).toBeTruthy();
    expect(screen.getByText('Solar Farm')).toBeTruthy();
    expect(screen.getByLabelText('2 unread')).toBeTruthy();
  });

  it('previews the last message, marking your own', async () => {
    await render(<CommunityScreen />);
    expect(await screen.findByText('Is the tee in stock?')).toBeTruthy();
    expect(screen.getByText('You: Count me in')).toBeTruthy();
  });

  it('shows recent people in a strip that opens their chat', async () => {
    const user = userEvent.setup();
    await render(<CommunityScreen />);
    await user.press(await screen.findByLabelText('Recent chat with Kofi'));
    expect(mockPush).toHaveBeenCalledWith('/conversation/c2');
  });

  it('offers a way to find someone to message', async () => {
    const user = userEvent.setup();
    await render(<CommunityScreen />);
    await user.press(await screen.findByLabelText('Find someone to message'));
    expect(mockPush).toHaveBeenCalledWith('/discover');
  });

  it('opens a conversation', async () => {
    const user = userEvent.setup();
    await render(<CommunityScreen />);
    await user.press(await screen.findByLabelText('Conversation with Ama Mensah'));
    expect(mockPush).toHaveBeenCalledWith('/conversation/c1');
  });

  it('searches and filters', async () => {
    const user = userEvent.setup();
    await render(<CommunityScreen />);
    await screen.findByText('Ama Mensah');
    await user.press(screen.getByLabelText('Unread'));
    expect(screen.queryByText('Kofi Tech')).toBeNull();
    await user.press(screen.getByLabelText('All'));
    await user.type(screen.getByLabelText('Search'), 'solar');
    expect(screen.queryByText('Ama Mensah')).toBeNull();
    expect(screen.getByText('Kofi Tech')).toBeTruthy();
  });

  it('explains how to start a conversation when there are none', async () => {
    mockGetList.mockResolvedValue([]);
    await render(<CommunityScreen />);
    expect(await screen.findByText('No conversations yet')).toBeTruthy();
  });
});
