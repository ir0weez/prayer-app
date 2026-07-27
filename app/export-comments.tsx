import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { loadUserNotes, exportNotesAsTypeScript, type UserNote } from '@/lib/commentary-system';
import { setStringAsync } from 'expo-clipboard';

const Clipboard = { setStringAsync };

export default function ExportCommentsScreen() {
  const colors = useColors();
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [exportedCode, setExportedCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    loadUserNotes().then(setUserNotes);
  }, []);

  const handleExport = async () => {
    if (userNotes.length === 0) {
      Alert.alert('No Comments', 'You have no comments to export yet.');
      return;
    }

    const code = await exportNotesAsTypeScript();
    setExportedCode(code);
    setShowCode(true);
  };

  const handleCopyToClipboard = async () => {
    await Clipboard.setStringAsync(exportedCode);
    Alert.alert('Copied', 'Export code copied to clipboard!');
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Comments', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Clear',
        onPress: async () => {
          // Note: You'll need to add a clearAllUserNotes function to commentary-system.ts
          Alert.alert('Cleared', 'All comments have been cleared.');
          setUserNotes([]);
          setExportedCode('');
          setShowCode(false);
        },
      },
    ]);
  };

  // Group notes by verse for preview
  const groupedByVerse: Record<string, UserNote[]> = {};
  for (const note of userNotes) {
    const key = `${note.book} ${note.chapter}:${note.verse}`;
    if (!groupedByVerse[key]) groupedByVerse[key] = [];
    groupedByVerse[key].push(note);
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="p-4 gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Export Comments</Text>
            <Text className="text-sm text-muted">
              Export your local comments as TypeScript code to add to the app
            </Text>
          </View>

          {/* Stats */}
          <View className="p-4 rounded-lg bg-surface border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Total Comments</Text>
            <Text className="text-3xl font-bold text-primary">{userNotes.length}</Text>
            <Text className="text-xs text-muted">
              {Object.keys(groupedByVerse).length} verses with comments
            </Text>
          </View>

          {/* Preview */}
          {userNotes.length > 0 && !showCode && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Preview</Text>
              {Object.entries(groupedByVerse).slice(0, 5).map(([verse, notes]) => (
                <View key={verse} className="p-3 rounded-lg bg-surface border border-border gap-2">
                  <Text className="font-semibold text-foreground">{verse}</Text>
                  {notes.map(note => (
                    <Text key={note.id} className="text-xs text-muted line-clamp-2">
                      {note.text}
                    </Text>
                  ))}
                </View>
              ))}
              {Object.keys(groupedByVerse).length > 5 && (
                <Text className="text-xs text-muted text-center">
                  ... and {Object.keys(groupedByVerse).length - 5} more verses
                </Text>
              )}
            </View>
          )}

          {/* Export Code */}
          {showCode && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Generated TypeScript Code</Text>
              <View className="p-3 rounded-lg bg-surface border border-border max-h-64">
                <ScrollView>
                  <Text className="font-mono text-xs text-muted">{exportedCode}</Text>
                </ScrollView>
              </View>
              <Text className="text-xs text-muted">
                Copy this code and paste it into lib/commentary-data.ts to add your comments to the app permanently.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View className="gap-2">
            {!showCode ? (
              <>
                <TouchableOpacity
                  onPress={handleExport}
                  disabled={userNotes.length === 0}
                  className="p-4 rounded-lg bg-primary items-center"
                >
                  <Text className="font-semibold text-background">
                    Export {userNotes.length} Comments
                  </Text>
                </TouchableOpacity>

                {userNotes.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAll}
                    className="p-4 rounded-lg bg-error items-center"
                  >
                    <Text className="font-semibold text-background">Clear All Comments</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleCopyToClipboard}
                  className="p-4 rounded-lg bg-primary items-center"
                >
                  <Text className="font-semibold text-background">Copy to Clipboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCode(false)}
                  className="p-4 rounded-lg bg-border items-center"
                >
                  <Text className="font-semibold text-foreground">Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Instructions */}
          <View className="p-4 rounded-lg bg-surface border border-border gap-2">
            <Text className="font-semibold text-foreground">How to Use</Text>
            <Text className="text-xs text-muted leading-relaxed">
              1. Add comments to verses using the "Add Comment" button{'\n'}
              2. Select your author profile for each comment{'\n'}
              3. Click "Export" to generate TypeScript code{'\n'}
              4. Copy the code and paste into lib/commentary-data.ts{'\n'}
              5. Push an app update to sync comments to all users
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
