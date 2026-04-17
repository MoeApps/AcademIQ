import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChapterSelectProps {
  chapters: string[];
  selectedChapters: string[];
  onSelectionChange: (selected: string[]) => void;
}

const ChapterSelect = ({ chapters, selectedChapters, onSelectionChange }: ChapterSelectProps) => {
  const toggleChapter = (chapter: string) => {
    if (selectedChapters.includes(chapter)) {
      onSelectionChange(selectedChapters.filter((c) => c !== chapter));
    } else {
      onSelectionChange([...selectedChapters, chapter]);
    }
  };

  const toggleAll = () => {
    if (selectedChapters.length === chapters.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...chapters]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all"
          checked={selectedChapters.length === chapters.length}
          onCheckedChange={toggleAll}
        />
        <Label htmlFor="select-all" className="text-sm font-medium text-card-foreground cursor-pointer">
          Select All
        </Label>
      </div>
      <div className="ml-1 space-y-2">
        {chapters.map((chapter, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Checkbox
              id={`chapter-${idx}`}
              checked={selectedChapters.includes(chapter)}
              onCheckedChange={() => toggleChapter(chapter)}
            />
            <Label htmlFor={`chapter-${idx}`} className="text-sm text-muted-foreground cursor-pointer">
              {chapter}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChapterSelect;
