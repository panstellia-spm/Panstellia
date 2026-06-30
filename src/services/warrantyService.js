import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { logActivity, LOG_ACTIONS, LOG_MODULES, LOG_STATUS } from './activityLogger';

// Helper to get current timestamp
const getTimestamp = () => new Date().toISOString();

/**
 * Log warranty history and activities
 */
export async function logWarrantyHistory({
  action,
  targetId,
  description,
  oldValue = null,
  newValue = null,
  reason = '',
  adminInfo = null
}) {
  try {
    const logEntry = {
      timestamp: getTimestamp(),
      adminId: adminInfo?.id || adminInfo?.uid || 'system',
      adminEmail: adminInfo?.email || 'system@panstellia.com',
      adminName: adminInfo?.name || adminInfo?.email?.split('@')[0] || 'System',
      action,
      targetId,
      targetType: 'warranty',
      description,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      reason
    };

    // 1. Log to dedicated warranty_history collection
    await addDoc(collection(db, 'warranty_history'), logEntry);

    // 2. Log to global activity logs
    await logActivity({
      module: LOG_MODULES.SYSTEM,
      action: LOG_ACTIONS.PRODUCT_UPDATED, // Reuse existing action category or fallback
      targetId,
      targetType: 'warranty',
      description: `[Warranty Audit] ${description} (Reason: ${reason || 'None'})`,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      status: LOG_STATUS.SUCCESS,
      adminInfo
    });
  } catch (err) {
    console.error('Failed to log warranty history:', err);
  }
}

/**
 * Validate a Warranty configuration
 */
export async function validateWarranty(warranty, isUpdate = false) {
  if (!warranty.name || !warranty.name.trim()) {
    throw new Error('Warranty name is required.');
  }
  if (!warranty.duration || !warranty.duration.trim()) {
    throw new Error('Warranty duration is required.');
  }
  
  // Exclude archived/deleted from duplicate name checks
  const q = query(collection(db, 'warranties'), where('status', '!=', 'archived'));
  const snap = await getDocs(q);
  const exists = snap.docs.some(doc => {
    if (isUpdate && doc.id === warranty.id) return false;
    return doc.data().name.trim().toLowerCase() === warranty.name.trim().toLowerCase();
  });

  if (exists) {
    throw new Error(`A warranty template named "${warranty.name}" already exists.`);
  }
}

/**
 * Validate a Warranty Assignment
 */
export async function validateAssignment(assignment) {
  if (!assignment.warrantyId) {
    throw new Error('Warranty template selection is required.');
  }
  if (!assignment.type || !['product', 'collection', 'category', 'brand'].includes(assignment.type)) {
    throw new Error('Invalid assignment target type.');
  }
  if (!assignment.target || !assignment.target.trim()) {
    throw new Error('Assignment target is required.');
  }

  // Check if selected warranty exists and is active
  const warRef = doc(db, 'warranties', assignment.warrantyId);
  const warSnap = await getDoc(warRef);
  if (!warSnap.exists()) {
    throw new Error('The selected warranty template does not exist.');
  }
  if (warSnap.data().status !== 'active') {
    throw new Error('The selected warranty template is inactive/draft. Please activate it first.');
  }
}

/**
 * Save / Update a Warranty Template
 */
export async function saveWarranty(warranty, adminInfo, reason = '') {
  const isUpdate = !!warranty.id;
  const warrantyId = warranty.id || `war_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const payload = {
    ...warranty,
    id: warrantyId,
    priority: Number(warranty.priority || 0),
    displayOrder: Number(warranty.displayOrder || 0),
    status: warranty.status || 'active',
    updatedAt: getTimestamp(),
    createdAt: warranty.createdAt || getTimestamp()
  };

  await validateWarranty(payload, isUpdate);

  let oldValue = null;
  if (isUpdate) {
    const snap = await getDoc(doc(db, 'warranties', warrantyId));
    if (snap.exists()) oldValue = snap.data();
  }

  await setDoc(doc(db, 'warranties', warrantyId), payload);

  await logWarrantyHistory({
    action: isUpdate ? 'UPDATE_WARRANTY' : 'CREATE_WARRANTY',
    targetId: warrantyId,
    description: `${isUpdate ? 'Updated' : 'Created'} warranty template "${payload.name}"`,
    oldValue,
    newValue: payload,
    reason,
    adminInfo
  });

  return warrantyId;
}

/**
 * Archive a Warranty Template (Soft Delete)
 */
export async function archiveWarranty(id, adminInfo, reason = '') {
  const ref = doc(db, 'warranties', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Warranty not found');
  
  const oldData = snap.data();
  const updated = {
    ...oldData,
    status: 'archived',
    archivedAt: getTimestamp(),
    updatedAt: getTimestamp()
  };

  await setDoc(ref, updated);

  await logWarrantyHistory({
    action: 'ARCHIVE_WARRANTY',
    targetId: id,
    description: `Archived warranty template "${oldData.name}"`,
    oldValue: oldData,
    newValue: updated,
    reason,
    adminInfo
  });
}

/**
 * Restore an Archived Warranty Template
 */
export async function restoreWarranty(id, adminInfo, reason = '') {
  const ref = doc(db, 'warranties', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Warranty not found');
  
  const oldData = snap.data();
  const updated = {
    ...oldData,
    status: 'active',
    archivedAt: null,
    updatedAt: getTimestamp()
  };

  await setDoc(ref, updated);

  await logWarrantyHistory({
    action: 'RESTORE_WARRANTY',
    targetId: id,
    description: `Restored warranty template "${oldData.name}"`,
    oldValue: oldData,
    newValue: updated,
    reason,
    adminInfo
  });
}

/**
 * Hard Delete a Warranty Template (requires cleaning up assignments)
 */
export async function deleteWarranty(id, adminInfo, reason = '') {
  const ref = doc(db, 'warranties', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Warranty not found');
  const oldData = snap.data();

  // Delete matching assignments
  const assignQuery = query(collection(db, 'warranty_assignments'), where('warrantyId', '==', id));
  const assignSnap = await getDocs(assignQuery);
  for (const assignDoc of assignSnap.docs) {
    await deleteDoc(doc(db, 'warranty_assignments', assignDoc.id));
  }

  await deleteDoc(ref);

  await logWarrantyHistory({
    action: 'DELETE_WARRANTY',
    targetId: id,
    description: `Permanently deleted warranty template "${oldData.name}" and cleared all its assignments`,
    oldValue: oldData,
    reason,
    adminInfo
  });
}

/**
 * Duplicate an existing Warranty Template
 */
export async function duplicateWarranty(id, adminInfo, reason = 'Duplicate template') {
  const ref = doc(db, 'warranties', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Warranty template not found');
  
  const data = snap.data();
  const duplicate = {
    ...data,
    id: `war_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: `${data.name} (Copy)`,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  };

  await saveWarranty(duplicate, adminInfo, reason);
  return duplicate.id;
}

/**
 * Save / Update a Warranty Assignment Rule
 */
export async function saveWarrantyAssignment(assignment, adminInfo, reason = '') {
  const assignId = assignment.id || `assign_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const payload = {
    ...assignment,
    id: assignId,
    enabled: assignment.enabled !== false,
    updatedAt: getTimestamp(),
    createdAt: assignment.createdAt || getTimestamp()
  };

  await validateAssignment(payload);

  let oldValue = null;
  const ref = doc(db, 'warranty_assignments', assignId);
  const snap = await getDoc(ref);
  if (snap.exists()) oldValue = snap.data();

  await setDoc(ref, payload);

  await logWarrantyHistory({
    action: oldValue ? 'UPDATE_ASSIGNMENT' : 'CREATE_ASSIGNMENT',
    targetId: assignId,
    description: `Assigned warranty ID "${payload.warrantyId}" to ${payload.type} "${payload.target}"`,
    oldValue,
    newValue: payload,
    reason,
    adminInfo
  });

  return assignId;
}

/**
 * Delete a Warranty Assignment
 */
export async function deleteWarrantyAssignment(id, adminInfo, reason = '') {
  const ref = doc(db, 'warranty_assignments', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Assignment not found');
  const oldData = snap.data();

  await deleteDoc(ref);

  await logWarrantyHistory({
    action: 'DELETE_ASSIGNMENT',
    targetId: id,
    description: `Deleted warranty assignment ID "${id}" targeting ${oldData.type} "${oldData.target}"`,
    oldValue: oldData,
    reason,
    adminInfo
  });
}

/**
 * Seed Default Data if Database is Empty
 */
export async function seedDefaultWarranties() {
  try {
    const warSnap = await getDocs(collection(db, 'warranties'));
    if (warSnap.empty) {
      console.log('Seed: warranties collection is empty. Seeding default warranties...');
      
      const defaultWarranty = {
        id: 'war_elite_3m',
        name: '3 Months Brand Warranty',
        duration: '3 Months',
        coverage: 'Manufacturing defects only.',
        exclusions: 'Accidental damage, water damage, color fading due to chemical exposure, wear and tear.',
        terms: 'Original invoice must be provided for claim validation.',
        replacementPolicy: '10 days replacement policy for manufacturing issues.',
        repairPolicy: 'Free repairs within 3 months from purchase date.',
        eligibility: 'Genuine purchases only; item must show no signs of abuse or tampering.',
        badge: 'Elite Quality Brand Warranty',
        icon: 'ShieldCheck',
        color: 'gold',
        priority: 10,
        status: 'active',
        startDate: getTimestamp(),
        endDate: null,
        displayOrder: 1,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp()
      };

      await setDoc(doc(db, 'warranties', 'war_elite_3m'), defaultWarranty);
      console.log('Seeded default warranty template: war_elite_3m');

      // Seed Assignment for internal category 'Lux Wear' which displays as 'Elite Series'
      const defaultAssignment = {
        id: 'assign_elite_series',
        warrantyId: 'war_elite_3m',
        type: 'category',
        target: 'Lux Wear',
        enabled: true,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp()
      };

      await setDoc(doc(db, 'warranty_assignments', 'assign_elite_series'), defaultAssignment);
      console.log('Seeded default assignment mapping for Lux Wear category');
    } else {
      console.log('Seed: warranties collection already has documents. Skipping seed.');
    }
  } catch (err) {
    console.error('Failed to seed default warranties:', err);
  }
}
