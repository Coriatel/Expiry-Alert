import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { GeneralNote } from '@/types';
import { formatDate } from '@/lib/utils';

interface GeneralNotesProps {
  notes: GeneralNote[];
  onAddNote: (content: string) => void;
  onDeleteNote: (id: number) => void;
}

export function GeneralNotes({ notes, onAddNote, onDeleteNote }: GeneralNotesProps) {
  const { t } = useTranslation();
  const [newNote, setNewNote] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  const latestNote = notes[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('dashboard.generalNotes')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest Note Display */}
        {latestNote && !showAllNotes && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(latestNote.created_at)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNotes(true)}
                className="h-auto p-1"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{latestNote.content}</p>
          </div>
        )}

        {/* All Notes View */}
        {showAllNotes && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{t('dashboard.viewAllNotes')}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNotes(false)}
                className="h-auto p-1"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('dashboard.noNotes')}
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteNote(note.id)}
                        className="h-auto p-1"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add New Note */}
        <div className="space-y-2">
          <Textarea
            placeholder={t('dashboard.addNote')}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full">
            {t('dashboard.addNote')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
