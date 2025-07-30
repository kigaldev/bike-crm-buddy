import { BrandingEditorForm } from "@/components/BrandingEditorForm";
import { Navigation } from "@/components/Navigation";

const BrandingConfigPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <BrandingEditorForm />
        </div>
      </div>
    </div>
  );
};

export default BrandingConfigPage;