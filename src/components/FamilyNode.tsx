
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

export interface FamilyMember {
  id: string;
  name: string;
  birthDate?: string;
  imageUrl?: string;
  gender?: 'male' | 'female' | 'other';
}

interface FamilyNodeProps {
  data: FamilyMember;
  selected?: boolean;
}

const FamilyNode = ({ data, selected }: FamilyNodeProps) => {
  const initials = data.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn(
      "min-w-[200px] animate-fade-in transition-shadow",
      "hover:shadow-xl",
      selected && "ring-2 ring-primary"
    )}>
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col items-center gap-2 p-2">
        <Avatar className="w-16 h-16">
          {data.imageUrl ? (
            <AvatarImage src={data.imageUrl} alt={data.name} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
        <div className="text-center">
          <h3 className="font-medium">{data.name}</h3>
          {data.birthDate && (
            <p className="text-sm text-muted-foreground">
              {data.birthDate}
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(FamilyNode);
