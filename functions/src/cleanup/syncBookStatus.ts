/**
 * PRD Section 17: 구판/절판 자동 감지.
 * 매일 새벽 2시 실행. isActive=true 도서에 대해 알라딘 ItemLookUp(ISBN-13)으로 itemStatus 확인 후
 * 절판/품절 → out_of_print, 구판 → old_edition, isActive=false 로 업데이트.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const BATCH_SIZE = 50;
const OUT_OF_PRINT_STATUSES = ['절판', '품절일시'];
const OLD_EDITION_STATUS = '구판';

function getStatusUpdate(itemStatus: string | undefined): 'out_of_print' | 'old_edition' | null {
  if (!itemStatus) return null;
  if (OUT_OF_PRINT_STATUSES.includes(itemStatus)) return 'out_of_print';
  if (itemStatus === OLD_EDITION_STATUS) return 'old_edition';
  return null;
}

interface AladinResponse {
  item?: Array<{ itemStatus?: string }>;
  errorCode?: number;
}

export const syncBookStatus = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const db = getFirestore();
    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) {
      console.error('syncBookStatus: ALADIN_TTB_KEY not set');
      return;
    }

    const snapshot = await db.collection('books')
      .where('isActive', '==', true)
      .get();

    const isbns: string[] = [];
    snapshot.docs.forEach((doc) => {
      const isbn = doc.id;
      if (/^978\d{10}$/.test(isbn)) isbns.push(isbn);
    });

    let updated = 0;
    for (let i = 0; i < isbns.length; i += BATCH_SIZE) {
      const batch = isbns.slice(i, i + BATCH_SIZE);
      for (const isbn of batch) {
        try {
          const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}&output=js&Version=20131101`;
          const res = await fetch(url);
          const text = await res.text();
          let data: AladinResponse = {};
          try {
            const cleaned = text.replace(/;\s*$/, '');
            data = JSON.parse(cleaned) as AladinResponse;
          } catch {
            continue;
          }

          if (data.errorCode || !data.item?.length) continue;

          const itemStatus = data.item[0]?.itemStatus;
          const newStatus = getStatusUpdate(itemStatus);
          if (newStatus) {
            await db.collection('books').doc(isbn).update({
              status: newStatus,
              isActive: false,
              updatedAt: new Date(),
            });
            updated += 1;
          }
        } catch (e) {
          console.warn(`syncBookStatus isbn=${isbn}`, e);
        }
      }
    }

    console.log(`syncBookStatus: processed ${isbns.length} books, updated ${updated} (out_of_print or old_edition)`);
  }
);
