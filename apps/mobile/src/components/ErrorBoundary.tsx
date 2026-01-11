import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        <Text variant="headlineSmall" style={styles.title}>
          {t('errors.somethingWentWrong', 'Something went wrong')}
        </Text>

        <Text variant="bodyMedium" style={styles.message}>
          {t('errors.unexpectedError', 'An unexpected error occurred. Please try again.')}
        </Text>

        {error && __DEV__ && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.errorLabel}>
                {t('errors.technicalDetails', 'Technical details')}
              </Text>
              <ScrollView style={styles.errorScroll}>
                <Text variant="bodySmall" style={styles.errorText}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </Text>
              </ScrollView>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.button}
          icon="refresh"
        >
          {t('actions.retry', 'Try again')}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  message: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 16,
  },
  errorCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fef2f2',
  },
  errorLabel: {
    color: '#991b1b',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  errorScroll: {
    maxHeight: 120,
  },
  errorText: {
    color: '#dc2626',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  button: {
    minWidth: 150,
  },
});

export default ErrorBoundaryClass;
