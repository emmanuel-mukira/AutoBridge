import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { useContacts, useDeleteContact } from "../hooks/useContacts";
import { ContactDialog } from "./ContactDialog";
import type { Account } from "../services/accountsApi";
import type { Contact } from "@/types/contact";

interface AccountContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function AccountContactsDialog({
  open,
  onOpenChange,
  account,
}: AccountContactsDialogProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const { data: contactsData, isLoading, error } = useContacts(account?.id);
  const deleteContactMutation = useDeleteContact(account?.id ?? 0);

  const handleDelete = async () => {
    if (!deletingContact) return;
    try {
      await deleteContactMutation.mutateAsync(deletingContact.id);
      setDeletingContact(null);
    } catch {
      // The mutation error remains visible in the parent dialog.
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsCreateDialogOpen(false);
      setEditingContact(null);
      setDeletingContact(null);
      deleteContactMutation.reset();
    }
    onOpenChange(nextOpen);
  };

  if (!account) return null;

  const contacts = contactsData?.contacts || [];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Account contacts</DialogTitle>
            <DialogDescription>
              Manage contacts for {account.businessName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-4 flex-shrink-0">
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {error ? (
              <div role="alert" className="text-center py-8 text-destructive">Unable to load contacts.</div>
            ) : isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading contacts...
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No contacts found. Add your first contact to get started.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell>{contact.title || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {!contact.email && !contact.phone && "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Contact actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(contact)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  deleteContactMutation.reset();
                                  setDeletingContact(contact);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t flex-shrink-0">
            {deleteContactMutation.error && <p role="alert" className="mr-auto text-sm text-destructive">{deleteContactMutation.error.message}</p>}
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ContactDialog
        open={isCreateDialogOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingContact(null);
          }
        }}
        accountId={account.id}
        accountName={account.businessName}
        contact={editingContact}
      />

      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(nextOpen) => !nextOpen && !deleteContactMutation.isPending && setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingContact?.firstName}{" "}
              {deletingContact?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
            {deleteContactMutation.error && <p role="alert" className="text-sm text-destructive">{deleteContactMutation.error.message}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContactMutation.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteContactMutation.isPending}>
              {deleteContactMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
