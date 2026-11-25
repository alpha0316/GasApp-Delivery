import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Star, X } from 'phosphor-react-native';
import { colors } from '../theme';

export interface RatingBand {
  label: string;
  tags: readonly string[];
}

export type RatingBands = Record<1 | 2 | 3 | 4 | 5, RatingBand>;

export const bandFor = (bands: RatingBands, score: number): RatingBand | null =>
  score >= 1 && score <= 5 ? bands[score as 1 | 2 | 3 | 4 | 5] : null;

// Stars, the tags offered for that score, and a comment. Moving to a score drops the tags it
// no longer offers and keeps the ones it shares.
export function useRatingForm(bands: RatingBands) {
  const [score, setScore] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  return {
    score,
    tags,
    comment,
    band: bandFor(bands, score),
    pickScore: (value: number) => {
      setScore(value);
      const next = bandFor(bands, value);
      setTags((prev) => prev.filter((t) => next?.tags.includes(t)));
    },
    toggleTag: (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    setComment,
    reset: () => {
      setScore(0);
      setTags([]);
      setComment('');
    },
  };
}

// The title row every rating sheet starts with: title on the left, a round close button.
export function RatingHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
        <X size={14} weight="bold" color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// The body of a rating sheet: the stars card with its tags, then the comment.
export function RatingFields({ form, placeholder = 'Your Comment' }: { form: ReturnType<typeof useRatingForm>; placeholder?: string }) {
  const { score, tags, comment, band, pickScore, toggleTag, setComment } = form;
  return (
    <>
      <View style={styles.card}>
        <View style={styles.starsRow} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: score }}>
          {[1, 2, 3, 4, 5].map((value) => {
            const on = value <= score;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => pickScore(value)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`}
              >
                <Star size={34} weight={on ? 'duotone' : 'regular'} color={on ? colors.star : '#4A4A4A'} />
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.scoreLabel}>{band ? band.label : 'Tap a star to rate'}</Text>

        {band && (
          <>
            <View style={styles.divider} />
            <View style={styles.tags}>
              {band.tags.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, on && styles.tagOn]}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {band && (
        <View style={styles.commentBlock}>
          <Text style={styles.label}>Leave A Comment</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="rgba(0,0,0,0.4)"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            accessibilityLabel="Your comment"
          />
        </View>
      )}
    </>
  );
}

export const ratingStyles = StyleSheet.create({
  content: { alignItems: 'stretch', paddingHorizontal: 16, paddingTop: 20 },
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.closeButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  scoreLabel: { fontSize: 13, color: 'rgba(0,0,0,0.5)', textAlign: 'center', marginTop: -2 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: -14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  tagOn: { backgroundColor: colors.tagOn, borderColor: colors.tagOn },
  tagText: { fontSize: 13, color: 'rgba(0,0,0,0.75)' },
  tagTextOn: { color: '#fff', fontWeight: '600' },
  commentBlock: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    padding: 10,
    paddingTop: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
});
