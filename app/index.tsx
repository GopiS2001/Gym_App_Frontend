import { Redirect } from 'expo-router';

// The root layout redirects based on session state; this keeps "/" valid.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
