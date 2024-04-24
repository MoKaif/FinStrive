using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace api.Dtos.Account
{
    public class RegisterDto
    {
        [Required]
        public String? UserName { get; set; }
        [Required]
        [EmailAddress]
        public String? Email{ get; set;}
        [Required]
        public String? Password { get; set; }
    }
}