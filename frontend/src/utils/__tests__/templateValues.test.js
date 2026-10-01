import { it, expect } from 'vitest';
import { renderTemplateValues } from '@/utils/templateValues';
it('escapes text and substitutes literally without treating names as HTML or replacement patterns', () => {
  expect(renderTemplateValues('<p>{{STUDENT_NAME}} · {{PROGRAM_COURSE}}</p>', { STUDENT_NAME: '$& <img onerror="bad()">', PROGRAM_COURSE: 'A & B' })).toBe('<p>$&amp; &lt;img onerror=&quot;bad()&quot;&gt; · A &amp; B</p>');
});
