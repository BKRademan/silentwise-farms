import { HourRecord } from "./database";

export interface HourFormData {
  Work_Date: Date;
  Hours_Worked: number;
  Employee_ID_FK: number;
  Grower_ID: number;
  Overtime?: number;
  PHoliday?: number;
  Emp_Rate?: number;
  Con_Tot?: number;
  Man_Fee?: number;
  Sick_Leave?: number;
}

export interface HourFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: HourRecord;
  mode: 'create' | 'edit';
}

export interface HourFormFields {
  Work_Date: Date;
  Hours_Worked: number;
  Employee_ID_FK: number;
  Grower_ID: number;
  Overtime?: number;
  PHoliday?: number;
  Emp_Rate?: number;
  Con_Tot?: number;
  Man_Fee?: number;
  Sick_Leave?: number;
} 