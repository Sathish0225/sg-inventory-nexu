
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmationProps {
  title: string;
  message: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmation = ({ title, message, itemName, onConfirm, onCancel }: DeleteConfirmationProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            {message}
          </CardDescription>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800">
              <strong>Item to delete:</strong> {itemName}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={onConfirm} 
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteConfirmation;
