function roundsVisibleToBranch(branchId) {
  if (!branchId) {
    return {
      $and: [
        { $or: [{ branchId: null }, { branchId: { $exists: false } }] },
        {
          $or: [
            { assignedBranchIds: { $exists: false } },
            { assignedBranchIds: { $size: 0 } }
          ]
        }
      ]
    };
  }

  return {
    $or: [
      { branchId },
      {
        $and: [
          { $or: [{ branchId: null }, { branchId: { $exists: false } }] },
          { assignedBranchIds: branchId }
        ]
      }
    ]
  };
}

module.exports = { roundsVisibleToBranch };
