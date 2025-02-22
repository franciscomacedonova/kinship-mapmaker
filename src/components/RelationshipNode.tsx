
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { RelationType } from '@/lib/types';

interface RelationshipNodeProps {
  data: {
    relationship: { id: string };
    relationType: RelationType;
  };
  selected?: boolean;
}

const RelationshipNode = ({ data, selected }: RelationshipNodeProps) => {
  return (
    <div 
      className={cn(
        "min-w-[100px] p-2 rounded-md",
        "border border-gray-200",
        selected && "ring-2 ring-primary"
      )}
      style={{ backgroundColor: data.relationType.color }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-center text-white font-medium">
        {data.relationType.name}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(RelationshipNode);
