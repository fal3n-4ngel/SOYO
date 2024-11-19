import { handlePathSelection } from "./serverUtils";


export const handlePathSelectionFrontend = (selectedPath: string) => () => {
  try {
    handlePathSelection(selectedPath);
  } catch (error) {
    console.error('Error selecting path:', error);
  }
};